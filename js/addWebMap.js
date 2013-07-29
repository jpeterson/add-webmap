/* globals define, esri */
define([
		'esri/map',
		'esri/request',
		'esri/arcgis/utils',
		'esri/layers/FeatureLayer',
		'esri/layers/ArcGISDynamicMapServiceLayer',
		'esri/layers/ArcGISImageServiceLayer',
		'esri/layers/ArcGISTiledMapServiceLayer',
		'dojo/_base/lang',
		'dojo/_base/array',
		'dojo/promise/all'
],

function(map, request, agsUtils, FeatureLayer, DynamicLayer, ImageLayer, TileLayer, lang, array, promiseAll) {
	return {
		map: null,
		url: 'http://www.arcgis.com/',
		query: 'type:"Web Map" -type:"Web Mapping Application"',

		init: function() {
			this.map = new esri.Map('map', {
				basemap: 'topo',
				center: [-98.45, 37.75], //long, lat
				zoom: 4,
				sliderStyle: 'small'
			});

			// Add event handlers for both clicking the search button
			// as well as pressing 'enter' in the search input
			$('.search-btn').click(lang.hitch(this, this.queryAGO));

			$('.search-keyword').keypress(lang.hitch(this, function(e) {
				if (e.keyCode === 13) {
					this.queryAGO();
					$('#addWebmapModal').modal('show');
				}
			}));
		},

		queryAGO: function() {

			// Clear existing results
			$('.results-form tbody > tr').remove();

			// Save the string in our input
			this.keyword = $('.search-keyword')[0].value;

			// Send request to AGO (for this demo we only get the first 10 results)
			var webmapRequest = request({
				url: this.url + 'sharing/rest/search',
				content: {
					f: 'json',
					q: '(' + ((this.keyword !== '') ? this.keyword + ' + ' : '-owner:esri* ') + this.query + ')'
				},
				handleAs: 'json'
			});

			// When request comes back, call this method
			webmapRequest.then(lang.hitch(this, this.renderResults));
		},

		renderResults: function(webmaps) {
			var webmapName,
				webmapLink,
				webmapAdd,
				webmapThumbnail;

			// Loop through all the results and render them
			array.forEach(webmaps.results, lang.hitch(this, function(webmap) {
				webmapLink = '<a target="_blank" href="' + this.url + 'home/item.html?id=' + webmap.id + '" >Link</a>';
				webmapThumbnail = '<a target="_blank" href="' + this.url + 'home/item.html?id=' + webmap.id + '" ><img src="' + this.url + 'sharing/content/items/' + webmap.id + '/info/' + webmap.thumbnail + '" /></a>';
				webmapName = webmap.title;
				webmapAdd = '<button class="add-webmap-button btn btn-success" data-webmap-id="' + webmap.id + '">add to map</button>';
				$('.add-row-here').append('<tr><td>' + webmapThumbnail + '</td><td>' + webmapLink + '</td><td>' + webmapName + '</td><td>' + webmapAdd + '</td></tr>');
			}));
			$('.add-webmap-button').click(lang.hitch(this, this.getWebmapLayers));
		},

		getWebmapLayers: function(e) {
			var itemId = e.target.attributes['data-webmap-id'].value;
			var item = agsUtils.getItem(itemId);

			item.then(lang.hitch(this, function(response) {
				var mapLayers = [],
					checks = [],
					layers = response.itemData.operationalLayers;

				// Loop through each layer and handle it as needed
				array.forEach(layers, function(layer) {

					// Skip layer if it is not visible
					if (layer.visibility === false) {
						return;
					}

					// If layer is a featureCollection, add as a featureLayer
					if (layer.featureCollection) {
						array.forEach(layer.featureCollection, function(featureSet) {
							mapLayers.push(new FeatureLayer(featureSet));
						});
						return;
					}

					// If the two previous conditions were not met, then we should have a URL to work with
					var layerUrl = layer.url.toLowerCase();

					// Now we are going to check for substrings in the URL to determine the type of AGS service
					if (layerUrl.indexOf('/featureserver') > -1 || !isNaN(layerUrl.slice(-1))) {
						mapLayers.push(new FeatureLayer(layer.url, layer));
					} else {
						// If not a Feature Service, we need to dig deeper to figure out what it is
						var check = request({
							url: layer.url,
							content: {
								f: 'json'
							},
							handleAs: 'json'
						});

						checks.push(check);

						// This is for demo purposes, it needs to be fleshed out further. There are quite a few 
						// permutations that need to be checked to make sure we support all the possible 'layer types' 
						// that are supported in AGO. Currently we are only doing very basic checks, so you will find 
						// a decent amount of webmaps fail to load within this application.
						check.then(function(checkResponse) {
							if (checkResponse.tileInfo) {
								// Create a TileLayer
								mapLayers.push(new TileLayer(layer.url, layer));
							} else if (layerUrl.indexOf('/imageserver') > -1) {
								// Create an ImageLayer
								mapLayers.push(new ImageLayer(layer.url, layer));
							} else if (layerUrl.indexOf('/mapserver') > -1) {
								// Create a DynamicLayer
								mapLayers.push(new DynamicLayer(layer.url, layer));
							} else {
								console.error('Layer type not supported'); // or we just haven't built in logic to check for it...
							}
						});
					}
				});

				// Once all checks have been returned, see what we have
				promiseAll(checks).then(lang.hitch(this, function(allResponse) {
					if (mapLayers.length) {
						// If we have layers, call this method
						this.addWebmapLayers(mapLayers, response.item.title);
					}
				}));

			}));


			function err(error) {
				// If there's an error in the request...
				console.error('Request failed: ', error);
			}
		},

		addWebmapLayers: function(layers, title) {
			// This is the title of the webmap we added
			console.log(title);

			// Add layers to our map
			this.map.addLayers(layers);

			// Hide the modal window
			$('#addWebmapModal').modal('hide');
		}
	};
});