var rebus = rebus || {};

rebus.screenReaderTest = function () {
    $('img').each(function () {
        var $img = $(this);
        if ($img.attr('alt')) {
            $img.attr('src', '');
        }
        else {
            $img.css('visibility', 'hidden');
        }
    });
    $('button').each(function () {
        var $btn = $(this),
            text = $btn.text();
        if (!text) {
            text = $btn.attr('aria-label');
            if (!text) {
                text = $btn.attr('title');
            }
        }
        //console.log($btn.attr('id'), text);
        if (text) {
            $btn.text(text);
        }
    });
};