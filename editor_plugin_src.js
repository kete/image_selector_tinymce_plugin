/**
 * editor_plugin_src.js
 *
 * Copyright 2011, Horowhenua Library Trust
 * Released under MIT License, see included LICENSE file
 */

(function() {
  // Load plugin specific language pack
  tinymce.PluginManager.requireLangPack('imageselector');

  tinymce.create('tinymce.plugins.ImageselectorPlugin', {
      /**
       * Initializes the plugin, this will be executed after the plugin has been created.
       * This call is done before the editor instance has finished it's initialization so use the onInit event
       * of the editor instance to intercept that event.
       *
       * @param {tinymce.Editor} ed Editor instance that the plugin is initialized in.
       * @param {string} url Absolute URL to where the plugin is located.
       */
    init : function(ed, url) {
	// Register the command so that it can be invoked by using tinyMCE.activeEditor.execCommand('mceImageselector');
	ed.addCommand('mceImageselector', function() {
	    ed.windowManager.open({
	      file : url + '/dialog.htm',
		  width : 900 + parseInt(ed.getLang('imageselector.delta_width', 0)),
		  height : 500 + parseInt(ed.getLang('imageselector.delta_height', 0)),
		  resizable: true,
		  inline : 1,
		  translate_i18n: false
		  }, {
	      plugin_url : url // Plugin absolute URL
		  });
	  });

	// Register imageselector button
	ed.addButton('imageselector', {
	  title : 'imageselector.desc',
	      cmd : 'mceImageselector',
	      image : url + '/img/imageselector.png'
	      });

	// Add a node change handler, selects the button in the UI when a image is selected
	ed.onNodeChange.add(function(ed, cm, n) {
	    cm.setActive('imageselector', n.nodeName == 'IMG');
	  });
      },

	/**
	 * Creates control instances based in the incomming name. This method is normally not
	 * needed since the addButton method of the tinymce.Editor class is a more easy way of adding buttons
	 * but you sometimes need to create more complex controls like listboxes, split buttons etc then this
	 * method can be used to create those.
	 *
	 * @param {String} n Name of the control to create.
	 * @param {tinymce.ControlManager} cm Control manager to use inorder to create new control.
	 * @return {tinymce.ui.Control} New control instance or null if no control was created.
	 */
	createControl : function(n, cm) {
	return null;
      },

	/**
	 * Returns information about the plugin as a name/value array.
	 * The current keys are longname, author, authorurl, infourl and version.
	 *
	 * @return {Object} Name/value array containing information about the plugin.
	 */
	getInfo : function() {
	return {
	longname : 'Imageselector plugin',
	    author : 'Walter McGinnis',
	    authorurl : 'http://waltermcginnis.com',
	    infourl : 'https://github.com/kete/image_selector_tinymce_plugin',
	    version : "0.3"
	    };
      }
    });

  // Register plugin
  tinymce.PluginManager.add('imageselector', tinymce.plugins.ImageselectorPlugin);
 })();
