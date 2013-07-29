var pathRegex = new RegExp(/\/[^\/]+$/);
var locationPath = location.pathname.replace(pathRegex, '');

require({
    baseUrl: 'js',
    paths: {
        app: './',
        esri: 'http://serverapi.arcgisonline.com/jsapi/arcgis/3.5/js/esri',
        dojo: 'http://serverapi.arcgisonline.com/jsapi/arcgis/3.5/js/dojo/dojo'
    }
}, ['app/addWebMap'], function(addWebMap) {
    addWebMap.init();
});