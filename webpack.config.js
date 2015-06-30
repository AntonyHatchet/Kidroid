/**
 * Created by anton_gorshenin on 29.06.2015.
 */
var path = require('path');
var webpack = require('webpack');
var fs = require('fs');
var nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

var config = {
    target: "async-node",
    context: path.join(__dirname, 'src'), // �������� ����������
    entry: './bin/www.js', // ���� ��� ������, ���� ��������� - ��������� hash (entry name => filename)
    output: {
        path: path.join(__dirname, './build/'), // �������� ����������
        filename: "server.js",
        libraryTarget: "commonjs"
    },
    plugins: [
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin()
    ],
    externals: nodeModules
};

module.exports = config;