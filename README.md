# hermione-sequential-tests-run

Plugin for [hermione](https://github.com/gemini-testing/hermione) to run selected tests in sequence.

You can read more about hermione plugins [here](https://github.com/gemini-testing/hermione#plugins).

## Installation

```bash
npm install hermione-sequential-tests-run
```

## Usage

### Configuration

Plugin has following configuration:

* **enabled** (optional) `Boolean` – enable/disable the plugin; by default plugin is enabled
* **commandName** (required) `String` - command name which will be added to hermione context and used in tests before test or suite declaration to run test sequentially in passed browser. By default the command is called - `sequentially`.

Also there is ability to override plugin parameters by CLI options or environment variables
(see [configparser](https://github.com/gemini-testing/configparser)).
Use `hermione_sequential_tests_run` prefix for the environment variables and `--hermione-sequential-tests-run` for the cli options.

### Hermione usage

Add plugin to your `hermione` config file:

```js
module.exports = {
    // ...
    system: {
        plugins: {
            'hermione-sequential-tests-run': {
                enabled: true,
                browsers: /ie/,
                commandName: 'sequentially' // as default (can be omitted)
            }
        }
    },
    //...
}
```

Example:

```js
describe('suite1', () => {
    it('test1', function() {...});

    it('test2', function() {...});

    hermione.sequentially.in('chrome');
    it('test3', function() {...});

    hermione.sequentially.in(/.*/);
    describe('suite2', () => {
        it('test4', function() {...});

        it('test5', function() {...});
    });
})
```

Suppose we have two browsers: `chrome` and `firefox`, so as a result:
- will be run in parallel:
  - tests `suite1 test1` and `suite1 test2` in chrome and firefox
  - test `suite1 test3` only in firefox
- will be run sequentially:
  - test `suite1 test3` in chrome
  - tests `suite2 test4` and `suite2 test5` in chrome and firefox

## Testing

Run [eslint](http://eslint.org) codestyle verification
```bash
npm run lint
```
