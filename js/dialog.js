tinyMCEPopup.requireLangPack();

var ImageselectorDialog = {
 init : function() {
    var f = document.forms[0];

    // Get the selected contents as text and place it in the input
    // f.someval.value = tinyMCEPopup.editor.selection.getContent({format : 'text'});
  },

 insert : function() {
    // Insert the contents from the input into the document
    // tinyMCEPopup.editor.execCommand('mceInsertContent', false, document.forms[0].someval.value);
    tinyMCEPopup.close();
  }
};

tinyMCEPopup.onInit.add(ImageselectorDialog.init, ImageselectorDialog);
