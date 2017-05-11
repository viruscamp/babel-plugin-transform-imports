import assert from 'assert';
import * as babel from 'babel-core';

function createOptions({ preventFullImport = false, transform = 'react-bootstrap/lib/${member}', camelCase = false, kebabCase = false, snakeCase = false }) {
    return {
        'react-bootstrap': { transform, preventFullImport, camelCase, kebabCase, snakeCase }
    };
};

const fullImportRegex = /require\('react-bootstrap'\);$/gm;
const memberImportRegex = /require\('react-bootstrap\/lib\/.+'\);$/gm;

function occurances(regex, test) {
    return (test.match(regex) || []).length;
}

function transform(code, options = createOptions({})) {
    return babel.transform(code, {
        presets: ['es2015'],
        plugins: [['./index', options]]
    }).code;
}

describe('import transformations', function() {
    it('should handle default imports', function() {
        let code = transform(`import Bootstrap from 'react-bootstrap';`);

        assert.equal(occurances(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurances(memberImportRegex, code), 0, 'number of member imports should be 0');
    });

    it('should handle namespace imports', function() {
        let code = transform(`import * as Bootstrap from 'react-bootstrap';`);

        assert.equal(occurances(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurances(memberImportRegex, code), 0, 'number of member imports should be 0');
    });

    it('should handle member imports', function() {
        let code = transform(`import { Grid, Row as row } from 'react-bootstrap';`);

        assert.equal(occurances(fullImportRegex, code), 0, 'number of full imports should be 0');
        assert.equal(occurances(memberImportRegex, code), 2, 'number of member imports should be 2');
    });

    it('should handle a mix of member and default import styles', function() {
        let code = transform(`import Bootstrap, { Grid, Row as row } from 'react-bootstrap';`);

        assert.equal(occurances(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurances(memberImportRegex, code), 2, 'number of member imports should be 2');
    });
});

describe('camelCase plugin option', function() {
    it('should use camel casing when set', function() {
        let options = createOptions({ camelCase: true });

        let code = transform(`import { CamelMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('camelMe'), -1, 'member name CamelMe should be transformed to camelMe');
    });
});

describe('kebabCase plugin option', function() {
    it('should use kebab casing when set', function() {
        let options = createOptions({ kebabCase: true });

        let code = transform(`import { KebabMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('kebab-me'), -1, 'member name KababMe should be transformed to kebab-me');
    });
});

describe('snakeCase plugin option', function() {
    it('should use snake casing when set', function() {
        let options = createOptions({ snakeCase: true });

        let code = transform(`import { SnakeMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('snake_me'), -1, 'member name SnakeMe should be transformed to snake_me');
    });
});

describe('transform as function', function() {
    it('should throw when provided filename is invalid', function() {
        let options = createOptions({ transform: 'missingFile.js' });

        assert.throws(() => {transform(`import { Row } from 'react-bootstrap';`, options)});
    });

    it('should throw when provided filename does not resolve to a function', function() {
        let options = createOptions({ transform: './test/invalidTransform.js' });

        assert.throws(() => {transform(`import { Row } from 'react-bootstrap';`, options)});
    });

    it('should properly execute transform function when provided', function() {
        let options = createOptions({ transform: './test/transform.js' });

        let code = transform(`import { upperCaseMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('UPPERCASEME'), -1, 'member name upperCaseMe should be transformed to UPPERCASEME');
    });
});

describe('preventFullImport plugin option', function() {
    it('should throw on default imports when truthy', function() {
        let options = createOptions({ preventFullImport: true });

        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should throw on namespace imports when truthy', function() {
        let options = createOptions({ preventFullImport: true });

        assert.throws(() => {transform(`import * as Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should not throw on member imports when truthy', function() {
        let options = createOptions({ preventFullImport: true });

        assert.doesNotThrow(() => {transform(`import { Grid, Row as row } from 'react-bootstrap';`, options)});
    });
});

describe('edge cases', function() {
    it('should throw when transform plugin option is missing', function() {
        let options = createOptions({ transform: null });

        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });
});
