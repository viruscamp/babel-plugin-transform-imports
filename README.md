# babel-plugin-transform-imports

Transforms member style imports:

```javascript
    import { Row, Grid as MyGrid } from 'react-bootstrap';
```

...into default style imports:

```javascript
    import Row from 'react-bootstrap/lib/Row';
    import MyGrid from 'react-bootstrap/lib/Grid';
```

## That's stupid, why would you do that?

When Babel encounters a member style import such as:

```javascript
    import { Grid, Row, Col } from 'react-bootstrap';
```

it will generate something similarish to:

```javascript
    var reactBootstrap = require('react-bootstrap');
    var Grid = reactBootstrap.Grid;
    var Row = reactBootstrap.Row;
    var Col = reactBootstrap.Col;
```

Some libraries, such as react-bootstrap, are rather large and pulling in the
entire module just to use a few pieces would be a big waste.  The only way
around this is to use default style imports:

```javascript
    import Grid from 'react-bootstrap/lib/Grid';
    import Row from 'react-bootstrap/lib/Row';
    import Col from 'react-bootstrap/lib/Col';
```

But, the more pieces we need, the more this sucks.  This plugin will allow you
to pull in just the pieces you need, without a separate import for each item.
Additionally, it can be configured to throw when somebody accidentally writes
an import which would cause the entire module to resolve, such as:

```javascript
    import Bootstrap, { Grid } from 'react-bootstrap';
    // -- or --
    import * as Bootstrap from 'react-bootstrap';
```

## Installation

```
npm install --save-dev babel-plugin-transform-imports
```

## Usage

*In .babelrc:*

```json
    {
        "plugins": [
            ["transform-imports", {
                "react-bootstrap": {
                    "transform": "react-bootstrap/lib/${member}",
                    "preventFullImport": true
                }
            }]
        ]
    }
```

That's it!

## Options

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `transform` | `string` | yes | `undefined` | The library name to use instead of the one specified in the import statement.  ${member} will be replaced with the member, aka Grid/Row/Col/etc. |
| `preventFullImport` | `boolean` | no | `false` | Whether or not to throw when an import is encountered which would cause the entire module to be imported. |