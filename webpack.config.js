const path = require('path');
const mode = process.env.NODE_ENV;

module.exports = {
    mode,
    entry: './demo/src/main.ts',
    output: {
        path: path.resolve(__dirname, 'demo/dist'),
    },
    devtool: {development: "eval-source-map"}[mode],
    module: {
        rules: [
            {
                test: /\.ts$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
        ],
    },
    resolve: {
        extensions: ['.ts'],
    },
};