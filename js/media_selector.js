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
      function getSource(context) {
	var idIndexes = context.params['id'].split('-');
	var providerIndex = idIndexes[1],
	  sourceIndex = idIndexes[2],
	  the_provider = context.providers[providerIndex];

	// get the results from selected source
	var selectedSource = the_provider.sources[sourceIndex];
	
	selectedSource['provider_title'] = the_provider['title'];
	
	context.trigger('updateSourceTo', selectedSource);
	
	context.trigger('updateResultsFor', selectedSource);
      }

      // these are the same, except for addition of pagination in route
      this.get('#/:id', function(context) { getSource(context) });
      this.get('#/:id/page/:page_number', function(context) { getSource(context) });

      // same as above, but target for search form for a source
      function postSearchOfSource(context) {
	var idIndexes = context.params['id'].split('-');
	var providerIndex = idIndexes[1],
	  sourceIndex = idIndexes[2],
	  the_provider = context.providers[providerIndex];

	// get the results from selected source
	var selectedSource = the_provider.sources[sourceIndex];
	
	selectedSource['provider_title'] = the_provider['title'];
	
	context.trigger('updateSourceTo', selectedSource);
	
	context.trigger('updateResultsFor', selectedSource);
      }

      // same except for pagination support
      this.post('#/:id', function(context) { postSearchOfSource(context) });
      this.post('#/:id/page/:page_number', function(context) { postSearchOfSource(context) });

      // a given result's display
      // show available sizes (based on requests to oembed provider for result id)
      // so user may choose which size
      this.get('#/results/:id', function(context) {
	  $('#results').fadeOut();
	  $('#providers').fadeOut();
	  $('#page-spinner').fadeIn();

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

		  $('#page-spinner').fadeOut();
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
		  $.ajax({ url: result.oembedUrlFor(size), dataType: 'json' })
		  .success(function(response) {
		      // TODO: make this detect xml or json and parse accordingly
		      // TODO: this is limited to same domain only for now, update to handle JSONP
		      // probably need to switch to $.ajax and more complete parameters call for jsonp
		      result[size.name] = response;
		      
                      if (typeof(result[size.name]) === 'string' ||
			  result[size.name]  === '' ||
			  typeof(result[size.name]) === 'undefined') {

                          result[size.name] = $.parseJSON(response);
                      }


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
	  $('#result-description-and-sizes').fadeOut();
	  $('#page-spinner').fadeIn();

	  // params['id'] decodes to normal url, but we need escaped version
	  var oembedUrl = this.params['id'];

	  $.ajax({ url: oembedUrl, dataType: 'json' })
	    .success(function(response) {
		// TODO: make this detect xml or json and parse accordingly
		// TODO: this is limited to same domain only for now, update to handle JSONP
		// probably need to switch to $.ajax and more complete parameters call for jsonp
		var selectionFromResponse = response;

		if (typeof(selectionFromResponse) === 'string' ||
		    selectionFromResponse  === '' ||
		    typeof(selectionFromResponse) === 'undefined') {

		  selectionFromResponse = $.parseJSON(response);
		}

		// add alt value for selection so we can use it in template
		var alt = selectionFromResponse.title;

		// add a full stop to title for better accessibility
		// start by stripping off trailing spaces for ease our following logic
		alt = alt.replace(/\s+$/g, "");

		if (alt.charAt( alt.length-1 ) === ".") {
		  alt = alt + '. ';
		}

		selectionFromResponse.alt = alt;
		
		// look up matching provider, check for code to call with selectionFromResponse
		var selectionProvider;

		$.each(context.providers, function(i, provider) {
		    // TODO: make sure this works with IE8
		    if (oembedUrl.indexOf(provider.domain) != -1) {
		      selectionProvider = provider;
		      return false;
		    }
		  });

		$('#page-spinner').fadeOut();

		if (selectionProvider !== '' &&
		    typeof selectionProvider !== 'undefined' &&
		    selectionProvider.insertIntoEditor !== '' &&
		    typeof selectionProvider.insertIntoEditor !== 'undefined') {
		  
		  if (selectionProvider.insertIntoEditor.editor !== '' &&
		      typeof selectionProvider.insertIntoEditor.editor !== 'undefined') {
		    
		    // TODO: tweak this based on provider.media_type in future
		    var valueToInsert = '<img src="' + selectionFromResponse.url + '" width="';
		    valueToInsert = valueToInsert + selectionFromResponse.width;
		    valueToInsert = valueToInsert + '" height="' + selectionFromResponse.height;
		    valueToInsert = valueToInsert + '" alt="' + selectionFromResponse.alt + '"> by <a href="';
		    valueToInsert = valueToInsert + selectionFromResponse.author_url + '">' + selectionFromResponse.author_name +'</a>';

		    if (selectionProvider.insertIntoEditor.editor === 'TinyMCE') {
		      tinyMCEPopup.editor.execCommand('mceInsertContent', false, valueToInsert);
		      tinyMCEPopup.close();		      
		    }
		  }
		  selectionProvider.processFinal(selectionFromResponse);

		} else {
		  // otherwise we render template
		  // this view takes whole of view
		  context.partial('templates/selection.hb', selectionFromResponse);
		}
	      })
	    .error(function() {
		context.log("oembed selection response failed for " + oembedUrl);
		context.partial('templates/oembed_failed.hb', { oembed_url: oembedUrl });
	      });
	});

      function sizesLoadedInto(context) {
	return $.get(mediaSelectorConfig.directory + 'sizes.json')
	  .success(function(response) {
	      // plain response is probably already json object if parse returns null
	      var responseAsJSON = response;

	      if (typeof(responseAsJSON) == 'string' ||
		  responseAsJSON === '' ||
		  typeof(responseAsJSON) === 'undefined') {

		responseAsJSON = $.parseJSON(response);
	      }

	      context.sizes = responseAsJSON;
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
	  $('#page-spinner').hide();
	  $('#results-list').text('');
	  $('h3.no-results-title').hide();
	  $('#results-spinner').fadeIn();

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
	    pageNumber = this.params['page_number'],
	    fullUrl = source.url;

	  if (searchTerms) {
	    fullUrl += searchTerms;
	  }

	  if (typeof(source['limit_parameter']) !== "undefined" &&
	      typeof(source['display_limit']) !== "undefined") {
	    
	    var limit_parameter_adjusted = source.limit_parameter;

	    if (searchTerms) {
	      limit_parameter_adjusted = limit_parameter_adjusted.replace(/^\?/, "&");
	    }

	    fullUrl += limit_parameter_adjusted + source.display_limit;

	    if (source['page_parameter'] !== '' && typeof(source['page_parameter']) !== "undefined") {
	      if (pageNumber === '' || typeof pageNumber === 'undefined') {
		pageNumber = 1;
	      }

	      source.nextPage = parseInt(pageNumber) + 1;
	      fullUrl += source.page_parameter + pageNumber.toString();
	    }
	  }

	  var resultRequest = $.get(fullUrl)
	    .success(function( response ) {
		$('#results-spinner').hide();
		$('#results-list').text('');

		var resultsTitle = source.name + ' ' + source.media_type_plural;

		if (searchTerms) {
		  resultsTitle = resultsTitle + ' for "' + searchTerms + '"';
		  source.searchTerms = searchTerms;
		}

		resultsTitle = resultsTitle +  '(click to select)';

		$('#results h2').text(resultsTitle);

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

		if (items.length) {
		  $('#results').append("<ul id=\"results-list\">");

		  items.each(function() {
		      if (itemsCount === itemsLimit) { return false; }
		
		      var resultThumbnail = $(this).find("thumbnail").attr('url');

		      if (!resultThumbnail || 0 === resultThumbnail.length) {
			var description = $(this).find('description').text();
			resultThumbnail = $(description).find('img').attr('src');
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

		  if (source.nextPage !== '' && typeof source.nextPage !== 'undefined') {
		    // clear them, if they exist, so we can replace them later
		    $('#search-form-next').remove();
		    $('#next-page').remove();

		    // if we have less items than display_limit,
		    // we don't have any more pages of results
		    // if equal, we assume there are more (faulty assumption, but relatively safe)
		    if (items.length === source.display_limit) {
		      if (searchTerms) {
			context.render('templates/source_next_page_link_search.hb', source)
			  .appendTo('#results');
		      } else {
			context.render('templates/source_next_page_link.hb', source)
			  .appendTo('#results');
		      }
		    }
		  }
		} else {
		  context.render('templates/no_results.hb', source)
		    .appendTo($('#results'));
		}
	      })
	    .error(function() {
		$('#results-spinner').hide();

		// clear them, as they are no longer relevant
		$('#search-form-next').remove();
		$('#next-page').remove();

		context.render('templates/results_failed.hb', source)
		  .appendTo($('#results'));
	      });
	});
    

    });
  
  $(function() {
      app.run('#/');
    });

 })(jQuery);

