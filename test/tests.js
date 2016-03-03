import assert from 'assert';
import * as babel from 'babel-core';

function createOptions(preventFullImport = false, transform = 'react-bootstrap/lib/${member}') {
    return {
        'react-bootstrap': { transform, preventFullImport }
    };
};

const fullImportRegex = /require\('react-bootstrap'\);$/gm;
const memberImportRegex = /require\('react-bootstrap\/lib\/.+'\);$/gm;

function occurances(regex, test) {
    return (test.match(regex) || []).length;
}

function transform(code, options = createOptions()) {
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

describe('preventFullImport plugin option', function() {
    it('should throw on default imports when truthy', function() {
        let options = createOptions(true);
        
        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should throw on namespace imports when truthy', function() {
        let options = createOptions(true);
        
        assert.throws(() => {transform(`import * as Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should not throw on member imports when truthy', function() {
        let options = createOptions(true);
        
        assert.doesNotThrow(() => {transform(`import { Grid, Row as row } from 'react-bootstrap';`, options)});
    });
});

describe('edge cases', function() {
    it('should throw when transform plugin option is missing', function() {
        let options = createOptions(false, null);

        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });
});