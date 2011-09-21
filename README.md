# image_selector_tinymce_plugin

## Description

Based on media_selector (https://github.com/kete/media_selector) JavaScript mini-application. See media_selector's README for dependencies, etc.

Image Selector is a jQuery and Sammy.js based mini-application for choosing from a list of providers' media assets (images in this case) that integrates into TinyMCE editor as a plugin.

Because of its dependency on jQuery, it doesn't currently work with TinyMCE's i18n translation scheme. See http://www.tinymce.com/forum/viewtopic.php?id=16761 for details. Hopefully this issue will be resolved in the future. In the meantime, translate_i18n is set to false.

## Installation

Copy the contents of this directory to directory called imageselector under your TinyMCE install's plugins director. Configure TinyMCE to use it via the init declaration.

You'll also need to set up JSON files for your image providers and the size you want. IMPORTANT! These are assumed to be under /javascripts/image_selector_config/ on your site. See https://github.com/kete/media_selector/blob/master/data/providers.json and https://github.com/kete/media_selector/blob/master/data/sizes.json for how (you'll need to adjust URLs, etc. to suit).

## Dependencies

TinyMCE provides the plugin API that we are integrating with.

jQuery (through a link to Google's CDN), Handlebars.js, and Sammy.js along with some Sammy.js plugins that are included in the javascripts directory.

## Author

image_selector_tinymce_plugin was created for the Kete project (http://kete.net.nz) and is maintained by Walter McGinnis <walter a-t katipo dot co dot nz>.

## License

image_selector_tinymce_plugin is covered by the MIT License. See LICENSE for more information.
