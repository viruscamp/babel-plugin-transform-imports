import assert from 'assert';
import * as babel from 'babel-core';
import path from 'path';

function createOptions({
    preventFullImport = false,
    transform = 'react-bootstrap/lib/${member}',
    memberConverter = null,
    skipDefaultConversion = false,
    libraryName = 'react-bootstrap',
    transformStyle = null,
}) {
    return {
        [libraryName]: { transform, preventFullImport, memberConverter, skipDefaultConversion, transformStyle }
    };
};

const fullImportRegex = /require\('react-bootstrap'\);$/gm;
const memberImportRegex = /require\('react-bootstrap\/lib\/.+'\);$/gm;

function occurrences(regex, test) {
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
        const code = transform(`import Bootstrap from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurrences(memberImportRegex, code), 0, 'number of member imports should be 0');
    });

    it('should handle namespace imports', function() {
        const code = transform(`import * as Bootstrap from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurrences(memberImportRegex, code), 0, 'number of member imports should be 0');
    });

    it('should handle member imports', function() {
        const code = transform(`import { Grid, Row as row } from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 0, 'number of full imports should be 0');
        assert.equal(occurrences(memberImportRegex, code), 2, 'number of member imports should be 2');
    });

    it('should handle a mix of member and default import styles', function() {
        const code = transform(`import Bootstrap, { Grid, Row as row } from 'react-bootstrap';`);

        assert.equal(occurrences(fullImportRegex, code), 1, 'number of full imports should be 1');
        assert.equal(occurrences(memberImportRegex, code), 2, 'number of member imports should be 2');
    });

    it('should handle relative filenames', function() {
        const libraryName = path.join(__dirname, '../local/path');
        const _transform = path.join(__dirname, '../local/path/${member}');
        const options = createOptions({ libraryName, transform: _transform })
        const code = transform(`import { LocalThing } from './local/path'`, options);

        assert.equal(/require\('.*LocalThing'\);$/m.test(code), true, 'LocalThing should be directly required');
    });

    it('should handle relative files with regex expressions', function() {
        const libraryName = '((\.{1,2}\/?)*)\/local\/path';
        const _transform = '${1}/local/path/${member}';
        const options = createOptions({ libraryName, transform: _transform })
        const code = transform(`import { LocalThing } from '../../local/path'`, options);

        assert.equal(/require\('\.\.\/\.\.\/local\/path\/LocalThing'\);$/m.test(code), true, 'regex is transformed');
    });

    it('should handle regex expressions', function() {
        const libraryName = 'package-(\\w+)\/?(((\\w*)?\/?)*)';
        const _transform = 'package-${1}/${2}/${member}';
        const options = createOptions({ libraryName, transform: _transform })
        const code = transform(`import { LocalThing } from 'package-one/local/path'`, options);

        assert.equal(/require\('package-one\/local\/path\/LocalThing'\);$/m.test(code), true, 'regex is transformed');
    });
});

describe('memberConverter="camel" option', function() {
    it('should use camel casing when set', function() {
        const options = createOptions({ memberConverter: 'camel' });

        const code = transform(`import { CamelMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('camelMe'), -1, 'member name CamelMe should be transformed to camelMe');
    });
});

describe('memberConverter="pascal" option', function() {
    it('should use pascal casing when set', function() {
        const options = createOptions({ memberConverter: 'pascal' });

        const code = transform(`import { pascalMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('PascalMe'), -1, 'member name pascalMe should be transformed to PascalMe');
    });
});

describe('memberConverter="kebab" option', function() {
    it('should use kebab casing when set', function() {
        const options = createOptions({ memberConverter: 'kebab' });

        const code = transform(`import { KebabMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('kebab-me'), -1, 'member name KababMe should be transformed to kebab-me');
    });
});

describe('memberConverter="snake" option', function() {
    it('should use snake casing when set', function() {
        const options = createOptions({ memberConverter: 'snake' });

        const code = transform(`import { SnakeMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('snake_me'), -1, 'member name SnakeMe should be transformed to snake_me');
    });
});

describe('memberConverter=(string)=>string option', function() {
    it('should use custom function', function() {
        const options = createOptions({
            memberConverter: function(name) {
                return '_' + name + '_';
            }
        });

        const code = transform(`import { CustomMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('_CustomMe_'), -1, 'member name CustomMe should be transformed to _CustomMe_');
    });
});

describe('transform as function', function() {
    it('should throw when provided filename is invalid', function() {
        const options = createOptions({ transform: 'missingFile.js' });

        assert.throws(() => {transform(`import { Row } from 'react-bootstrap';`, options)});
    });

    it('should throw when provided filename does not resolve to a function', function() {
        const options = createOptions({ transform: './test/invalidTransform.js' });

        assert.throws(() => {transform(`import { Row } from 'react-bootstrap';`, options)});
    });

    it('should properly execute transform function when provided', function() {
        const options = createOptions({ transform: './test/transform.js' });

        const code = transform(`import { upperCaseMe } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('UPPERCASEME'), -1, 'member name upperCaseMe should be transformed to UPPERCASEME');
    });

    it('should call the transform as a function when provided as so', function() {
        const options = createOptions({ transform: function(input) { return `path/${input}`; } });

        const code = transform(`import { somePath } from 'react-bootstrap';`, options);

        assert.notEqual(code.indexOf('path/somePath'), -1, 'function should transform somePath to path/somePath');
    });
});

describe('preventFullImport plugin option', function() {
    it('should throw on default imports when truthy', function() {
        const options = createOptions({ preventFullImport: true });

        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should throw on namespace imports when truthy', function() {
        const options = createOptions({ preventFullImport: true });

        assert.throws(() => {transform(`import * as Bootstrap from 'react-bootstrap';`, options)});
    });

    it('should not throw on member imports when truthy', function() {
        const options = createOptions({ preventFullImport: true });

        assert.doesNotThrow(() => {transform(`import { Grid, Row as row } from 'react-bootstrap';`, options)});
    });
});

describe('skipDefaultConversion plugin option', function() {
    it('should retain named import syntax when enabled', function() {
        const options = createOptions({ skipDefaultConversion: true });

        const code = transform(`import { Grid, Row as row } from 'react-bootstrap';`, options);

        assert.equal(code.indexOf('_interopRequireDefault'), -1, 'skipDefaultConversion should not allow conversion to default import');
    })
});

describe('edge cases', function() {
    it('should throw when transform plugin option is missing', function() {
        const options = createOptions({ transform: null });

        assert.throws(() => {transform(`import Bootstrap from 'react-bootstrap';`, options)});
    });
});

describe('transformStyle plugin option', function() {
    it('should add one import statement for side effects only', function() {
        const options = createOptions({
            libraryName: 'ant-design-vue',
            memberConverter: 'kebab',
            transformStyle: 'ant-design-vue/lib/${member}/style'
        });

        const code = transform(`import { DataTable } from 'ant-design-vue';`, options)

        assert.equal(occurrences(/^require\('ant-design-vue\/lib\/data-table\/style'\)\;$/m, code), 1, 'number of style imports should be 1');
    });
});

describe('transformStyle plugin option as array', function() {
    it('should add two import statements for side effects only', function() {
        const options = createOptions({
            libraryName: 'ant-design-vue',
            memberConverter: 'kebab',
            transformStyle: ['ant-design-vue/lib/${member}/style', 'ant-design-vue/lib/${member}/style/css']
        });

        const code = transform(`import { DataTable as ADataTable } from 'ant-design-vue';`, options)

        assert.equal(occurrences(/^require\('ant-design-vue\/lib\/data-table\/style'\)\;$/m, code), 1, 'number of style imports should be 1');
        assert.equal(occurrences(/^require\('ant-design-vue\/lib\/data-table\/style\/css'\);$/m, code), 1, 'number of style/css imports should be 1');
    });
});

describe('transformStyle plugin option as function', function() {
    it('should add one import statement for side effects only', function() {
        const options = createOptions({
            libraryName: 'ant-design-vue',
            memberConverter: 'kebab',
            transformStyle: function(importName, matches) {
                return `ant-design-vue/lib/${importName.toUpperCase()}/STYLE`;
            }
        });

        const code = transform(`import { DataTable } from 'ant-design-vue';`, options)

        assert.equal(occurrences(/^require\('ant-design-vue\/lib\/DATA-TABLE\/STYLE'\)\;$/m, code), 1, 'number of style imports should be 1');
    });
});
