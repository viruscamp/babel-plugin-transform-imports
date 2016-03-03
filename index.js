import _template from 'lodash.template';
import * as types from 'babel-types';

const pluginName = 'babel-plugin-transform-imports';

export default function() {
    return {
        visitor: {
            ImportDeclaration: (path, state) => {
                // https://github.com/babel/babel/tree/master/packages/babel-types#timportdeclarationspecifiers-source

                // path.node has properties 'source' and 'specifiers' attached.
                // path.node.source is the library/module name, aka 'react-bootstrap'.
                // path.node.specifiers is an array of ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier

                if (path.node.source.value in state.opts) {
                    const source = path.node.source.value;
                    const opts = state.opts[source];

                    if (!opts.transform) {
                        throw new Error(`${pluginName}: transform option is required for module ${source}`);
                    }
                    const sourceTransformTemplate = _template(opts.transform);

                    const transforms = [];

                    const fullImports = path.node.specifiers.filter(specifier => specifier.type !== 'ImportSpecifier');
                    const memberImports = path.node.specifiers.filter(specifier => specifier.type === 'ImportSpecifier');

                    if (fullImports.length > 0) {
                        // Examples of "full" imports:
                        //      import * as name from 'module'; (ImportNamespaceSpecifier)
                        //      import name from 'module'; (ImportDefaultSpecifier)

                        if (opts.preventFullImport)
                            throw new Error(`${pluginName}: import of entire module ${source} not allowed due to preventFullImport setting`);

                        if (memberImports.length > 0) {
                            // Swap out the import with one that doesn't include member imports.  Member imports should each get their own import line
                            // transform this:
                            //      import Bootstrap, { Grid } from 'react-bootstrap';
                            // into this:
                            //      import Bootstrap from 'react-bootstrap';
                            transforms.push(types.importDeclaration(fullImports, types.stringLiteral(source)));    
                        }
                    }

                    memberImports.forEach(memberImport => {
                        // Examples of member imports:
                        //      import { member } from 'module'; (ImportSpecifier)
                        //      import { member as alias } from 'module' (ImportSpecifier)

                        // transform this:
                        //      import { Grid as gird } from 'react-bootstrap';
                        // into this:
                        //      import gird from 'react-bootstrap/lib/Grid';
                        transforms.push(types.importDeclaration(
                            [types.importDefaultSpecifier(types.identifier(memberImport.local.name))],
                            types.stringLiteral(sourceTransformTemplate({ member: memberImport.imported.name }))
                        ));
                    });

                    if (transforms.length > 0)
                        path.replaceWithMultiple(transforms);
                }
            }
        }
    }
}