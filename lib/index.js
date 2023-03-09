'use strict';

const _ = require('lodash');
const parseConfig = require('./config');

const isMatched = (matcher, value) => _.isRegExp(matcher) ? matcher.test(value) : _.isEqual(matcher, value);
const isMatchedBro = (browserId, matcher) => [].concat(matcher).some((m) => isMatched(m, browserId));

const isSkippedTest = test => test.pending || test.silentSkip;
const shouldOmitTest = test => isSkippedTest(test) || test.disabled;
const getTestId = test => `${test.id}/${test.browserId}`;

module.exports = (hermione, opts) => {
    const config = parseConfig(opts);

    if (!config.enabled || hermione.isWorker()) {
        hermione.on(hermione.events.BEFORE_FILE_READ, ({testParser}) => {
            testParser.setController(config.commandName, {in: _.noop});
        });

        return;
    }

    const seqSuiteIds = {};
    const seqTestIds = {};
    const seqTests = {};

    hermione.on(hermione.events.BEFORE_FILE_READ, ({testParser}) => {
        testParser.setController(config.commandName, {
            in: function(matcher) {
                if (!isMatchedBro(this.browserId, matcher)) {
                    return;
                }

                const storageIds = this.suites ? seqSuiteIds : seqTestIds;

                if (!storageIds[this.browserId]) {
                    storageIds[this.browserId] = [];
                }

                storageIds[this.browserId].push({id: this.id()});
            }
        });
    });

    hermione.prependListener(hermione.events.AFTER_TESTS_READ, (testCollection) => {
        const shouldRunSequentially = (runnable, browserId, storage = seqTestIds) => {
            const foundRunnable = runnable.id && _.find(storage[browserId], {id: runnable.id()});

            return foundRunnable || runnable.parent && shouldRunSequentially(runnable.parent, browserId, seqSuiteIds);
        };

        testCollection.eachTest((test, browserId) => {
            if (shouldOmitTest(test) || !shouldRunSequentially(test, browserId)) {
                return;
            }

            test.disabled = true;
            const testId = getTestId(test);
            seqTests[testId] = test;
        });
    });

    hermione.on(hermione.events.RUNNER_START, () => {
        for (const [testId, test] of Object.entries(seqTests)) {
            if (isSkippedTest(test)) {
                delete seqTests[testId];
                continue;
            } else {
                test.disabled = false;
                break;
            }
        }
    });

    hermione.on(hermione.events.TEST_END, (test) => {
        const testId = getTestId(test);
        const seqTest = seqTests[testId];

        if (!seqTest) {
            return;
        }

        delete seqTests[testId];

        const nextSeqTests = Object.values(seqTests);
        if (_.isEmpty(nextSeqTests)) {
            return;
        }

        const nextSeqTest = nextSeqTests[0];
        nextSeqTest.disabled = false;

        hermione.addTestToRun(nextSeqTest, nextSeqTest.browserId);
    });
};
