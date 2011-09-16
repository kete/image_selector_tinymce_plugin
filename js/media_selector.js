/**
 * media_selector.js
 *
 * Copyright 2011, Horowhenua Library Trust
 * Released under MIT License, see included LICENSE file
 *
 * expects a mediaSelectorConfig object to be defined before this file is run
 * it should look something like this:
 *
 * { directory: path/to/directory/for/config/files/ }
 *
 */
(function($) {
  
  var app = $.sammy('#main', function() {
      this.use(Sammy.Handlebars, 'hb');

      this.helpers({
	stubUrlForResult: function() {
	    return document.URL.split('#')[0] + '#/results/'
	  },
	providerListIdFor: function(providerIndex) {
	    return 'provider-list-' + providerIndex;
	  },
	providerTitleIdFor: function(providerIndex) {
	    return 'provider-title-' + providerIndex;
	  },
	setProviders: function(context) {
	    $('#providers-spinner').hide();

	    $.each(context.providers, function(i, provider) {
		$('#providers').append("<h3 class=\"provider-title\" id=\"" + context.providerTitleIdFor(i) + "\">" + provider.title + '</h3>');
		$('#providers').append("<ul id=\"" + context.providerListIdFor(i) + "\"></div>");
	      });
	  },
	sourceIdFor: function(providerIndex, sourceIndex) {
	    return 'source-' + providerIndex + '-' + sourceIndex;
	  },
	sourceTemplateStub: 'templates/source'
	});

      // load providers data for every request
      this.around(function(callback) {
	  var context = this;
	  this.load(mediaSelectorConfig.directory + 'providers.json')
            .then(function(providers) {
		context.providers = providers;
	      })
            .then(callback);
	});

      // index has two panes; providers with their sources and results for selected source
      // which in index case (none specified) is first source of first provider
      this.get('#/', function(context) {
	  // get the results from default_source
	  // assumes that first provider's first source isn't a search
	  var defaultSource = this.providers[0].sources[0];

	  defaultSource.sourceId = context.sourceIdFor(0, 0);

	  defaultSource['provider_title'] = this.providers[0]['title'];

	  this.trigger('updateSourceTo', defaultSource);

	  this.trigger('updateResultsFor', defaultSource);
	});

      // results for a give source id
      // selected source indicated in providers source list
      this.get('#/:id', function(context) {
	  var idIndexes = this.params['id'].split('-');
	  var providerIndex = idIndexes[1],
	    sourceIndex = idIndexes[2],
	    the_provider = this.providers[providerIndex];

	  // get the results from selected source
	  var selectedSource = the_provider.sources[sourceIndex];

	  selectedSource['provider_title'] = the_provider['title'];

	  this.trigger('updateSourceTo', selectedSource);

	  this.trigger('updateResultsFor', selectedSource);
	});

      // same as above, but target for search form for a source
      this.post('#/:id', function(context) {
	  var idIndexes = this.params['id'].split('-');
	  var providerIndex = idIndexes[1],
	    sourceIndex = idIndexes[2],
	    the_provider = this.providers[providerIndex];

	  // get the results from selected source
	  var selectedSource = the_provider.sources[sourceIndex];

	  selectedSource['provider_title'] = the_provider['title'];

	  this.trigger('updateSourceTo', selectedSource);

	  this.trigger('updateResultsFor', selectedSource);
	});

      // a given result's display
      // show available sizes (based on requests to oembed provider for result id)
      // so user may choose which size
      this.get('#/results/:id', function(context) {
	  // params['id'] decodes to normal url, but we need escaped version
	  var resultUrl = escape(this.params['id']);

	  var result = {
	  url: resultUrl,
	  hasAllSizes: false,
	  hasSizesError: false,
	  render: function(context) {
	      this.updateWithNeededSizesThenRender(context);
	    },
	  updateWithNeededSizesThenRender: function(context) {
	      result = this;

	      if (result.hasAllSizes || result.hasSizesError) {
		if (!(result.hasSizeError)) {
		  // rearrange result to be an array
		  // so we don't need to know about the keys of sizes in the template
		  var resultSizes = [],
		    resultTitle = '',
		    resultAuthor= {};
		  
		  var sizeCount = 0;

		  $.each(sizesNames(context), function(i, sizeName) {
		      result[sizeName]["size_name"] = sizeName;

		      var currentSize = {};

		      $.each(context.sizes, function(i, sizeOption) {
			  if (sizeName === sizeOption.name) {
			    currentSize = sizeOption;
			    return false;
			  }
			});

		      result[sizeName]["oembed_url"] = encodeURIComponent(result.oembedUrlFor(currentSize));

		      resultSizes.push(result[sizeName]);
		      
		      sizeCount++;
		      
		      if (sizeCount === 1) {
			resultTitle = result[sizeName].title;

			resultAuthor = {
			url: result[sizeName].author_url,
			name: result[sizeName].author_name
			};
		      }
		    });

		  var resultForTemplate = {
		  result_title: resultTitle,
		  result_author_url: resultAuthor.url,
		  result_author_name: resultAuthor.name,
		  sizes: resultSizes
		  };

		  // this views takes whole area of page
		  context.partial('templates/result.hb', resultForTemplate);
		}
	      } else {
		// check sizes that are already complete
		var neededSizes = [];

		$.each(sizesNames(context), function(i, sizeName) {
		    // if undefined for sizeName
		    // push to neededSizes
		    if (typeof(result[sizeName]) == "undefined") {
		      neededSizes.push(sizeName);
		    }
		  });
	      
		if (neededSizes.length === 0) {
		  // this will complete recursion during next call
		  result.hasAllSizes = true;
		  result.updateWithNeededSizesThenRender(context);
		} else {
		  // get the first in neededSizes
		  var nextSizeName = neededSizes.shift();
		  size = {};

		  $.each(context.sizes, function(i, sizeOption) {
		      if (nextSizeName === sizeOption.name) {
			size = sizeOption;
			return false;
		      }
		    });

		  // and append what is returned from oembed to result object for that size name
		  $.get(result.oembedUrlFor(size))
		  .success(function(response) {
		      // TODO: make this detect xml or json and parse accordingly
		      // TODO: this is limited to same domain only for now, update to handle JSONP
		      // probably need to switch to $.ajax and more complete parameters call for jsonp
		      result[size.name] = $.parseJSON(response);

		      // scope issue, response is set in calling scope, and not getting set with recursive call
		      result.updateWithNeededSizesThenRender(context);
		    })
		  .error(function() {
		      context.log("oembed response failed for " + size.name);
		      context.partial('templates/oembed_failed.hb', { oembed_url: oembedUrlFor(size) } );
		      // this will break cycle of recursive calls
		      result.hasSizesError = true;
		      result.updateWithNeededSizesThenRender(context);
		    });
		}
	      }
	    },
	  oembedUrlFor: function(size) {
	      var oembed_url = result.provider.oembed_endpoint + '?url=' + result.url;
	      oembed_url += '&maxwidth=' + size.width;
	      oembed_url += '&maxheight=' + size.height;
	      return oembed_url;
	    }
	  };

	  // look up provider oembed endpoint
	  // TODO: replace this with something that doesn't iterate through each provider
	  $.each(context.providers, function(i, provider) {
	      // TODO: make sure this works with IE8
	      if (result.url.indexOf(provider.domain) != -1) {
		result["provider"] = provider;
		return false;
	      }
	    });

	  $.when(sizesLoadedInto(context))
	    .then(function() {
		result.render(context)
	      });

	});

      // this gives selected result and the user's selected size
      // and outputs end result of oembed request for html to embed the result at the selected size
      this.get('#/selections/:id', function(context) {
	  // params['id'] decodes to normal url, but we need escaped version
	  var oembedUrl = this.params['id'];

	  $.get(oembedUrl)
	    .success(function(response) {
		// TODO: make this detect xml or json and parse accordingly
		// TODO: this is limited to same domain only for now, update to handle JSONP
		// probably need to switch to $.ajax and more complete parameters call for jsonp
		var selectionForTemplate = $.parseJSON(response);

		// add alt value for selection so we can use it in template
		var alt = selectionForTemplate.title;

		// add a full stop to title for better accessibility
		// start by stripping off trailing spaces for ease our following logic
		alt = alt.replace(/\s+$/g, "");

		if (alt.charAt( alt.length-1 ) === ".") {
		  alt = alt + '. ';
		}

		selectionForTemplate.alt = alt;

		// this view takes whole of view
		context.partial('templates/selection.hb', selectionForTemplate);
	      })
	    .error(function() {
		context.log("oembed selection response failed for " + oembedUrl);
		context.partial('templates/oembed_failed.hb', { oembed_url: oembedUrl });
	      });
	});

      function sizesLoadedInto(context) {
	return $.get(mediaSelectorConfig.directory + 'sizes.json')
	  .success(function(response) {
	      context.sizes = $.parseJSON(response);
	    })
	  .error(function() {
	      context.log("response failed");
	      context.partial('templates/sizes_failed.hb');
	    });
      }

      function sizesNames(context) {
	var names = [];
	$.each(context.sizes, function(i, size) {
	    names.push(size.name);
	  });
	return names;
      }

      // route = #/id (id of source) - in form provider index - source index
      // i.e. 0-1 would be the first provider's second source
      // route = #/id (id of source) + params[search_terms] for searchable source
      // route for results = #/results/id where id is url
      // add to results:
      // or upload image -> requests url for upload and returns to #/results/id
      // or add image URL
      // add to result detail page a "back" button
      this.bind('updateSourceTo', function(e, selectedSource) {
	  $('#results-list').text('');
	  $('h3.no-results-title').hide();
	  $('#results-spinner').show();

	  context = this;

	  var searchTerms = this.params['search_terms'];

	  if ($('h3.provider-title').length === 0) {
	    this.setProviders(context);
	  }

	  $.each(this.providers, function(i, provider) {
	      var providerIndex = i;
	      var providerListId = context.providerListIdFor(providerIndex);

	      $('#' + providerListId).text('');

	      $.each(provider.sources, function(i, source) {
		  source.sourceId = context.sourceIdFor(providerIndex, i);
		  context.log("sourceId is: " + source.sourceId);

		  var appropriate_template = context.sourceTemplateStub;

		  if (selectedSource && source === selectedSource) {
		    appropriate_template += '_selected';
		  }
		  
		  if (source.searchable_stub) {
		    appropriate_template += '_search';

		    if (searchTerms) {
		      source.value = searchTerms;
		    } else {
		      source.value = '';
		    }
		  }
		  
		  appropriate_template += '.hb';

		  context.render(appropriate_template, source)
		    .appendTo("#" + providerListId);
		});

	      // HACK: for some reason when '&target_service=' + targetService is added, handlebars fails to parse {{url}} correctly
	      // this worksaround the issue in an ugly fashion
	      provider.upload_startpoint['service_target_param'] = '&service_target=' + escape(context.stubUrlForResult());

	      if (typeof(provider.upload_startpoint) != "undefined") {
		context.render('templates/upload.hb', provider.upload_startpoint)
		  .appendTo("#" + providerListId);
	      }
	    });
	});

      // get each of the entries up to limit
      // render in template for result
      // append to #results
      // animate the results each being added
      this.bind('updateResultsFor', function(e, source) {
	  context = this;

	  var searchTerms = this.params['search_terms'],
	    full_url = source.url;

	  if (searchTerms) {
	    full_url += searchTerms;
	  }

	  if (typeof(source['limit_parameter']) != "undefined" &&
	      typeof(source['display_limit']) != "undefined") {
	    full_url += source.limit_parameter + source.display_limit;
	  }

	  var resultRequest = $.get(full_url)
	    .success(function( response ) {
		$('#results-spinner').hide();
		$('#results-list').text('');

		var resultsTitle = 'Results of ' + source.name + ' in ' + source.provider_title;

		if (searchTerms) {
		  resultsTitle = resultsTitle + ' for "' + searchTerms + '"';
		}

		$('#results h2').text(resultsTitle);

		// TODO: provide pagination
		var itemsLimit = source.display_limit;
		var itemsCount = 0;

		// items from rss items or atom entries
		// i want image thumbnail src (enclosure or media:thumbnail)
		// title
		// full url (link)
		var items = $(response).find('item');

		// handle Atom
		if (items.length === 0) {
		  items = $(response).find('entry');
		}

		if (items.length > 0) {
		  $('#results').append("<ul id=\"results-list\">");

		  items.each(function() {
		      if (itemsCount === itemsLimit) { return false; }
		
		      var resultThumbnail = $(this).find("thumbnail").attr('url');

		      if (!resultThumbnail || 0 === resultThumbnail.length) {
			// TODO: currently broken
			$(this).find('description').each(function() {
			    resultThumbnail = $(this).find('img').attr('src');
			  });
		      }
		
		      var resultTitle = $(this).find('title').text();
		      var resultLink = $(this).find('link').text();
		
		      var result = {
		      title: resultTitle,
		      link: resultLink,
		      link_escaped: encodeURIComponent(resultLink),
		      thumbnail_url: resultThumbnail
		      }
		
		      context.render('templates/result_thumbnail.hb', result)
			.appendTo('#results-list');
		
		      itemsCount++;
		    });
		  $('#results').append("</ul>");
		} else {
		  context.render('templates/no_results.hb', source)
		    .appendTo($('#results'));
		}
	      })
	    .error(function() {
		$('#results-spinner').hide();
		context.render('templates/results_failed.hb', source)
		  .appendTo($('#results'));
	      });
	});
    

    });
  
  $(function() {
      app.run('#/');
    });

 })(jQuery);

