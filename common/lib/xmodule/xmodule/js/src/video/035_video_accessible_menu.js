(function (requirejs, require, define) {

// VideoAccessibleMenu module.
define(
'video/035_video_accessible_menu.js',
[],
function () {

    // VideoAccessibleMenu() function - what this module "exports".
    return function (state) {
        var dfd = $.Deferred();

        if (state.el.find('li.video-tracks') === 0) {
            dfd.resolve();
            return dfd.promise();
        }

        state.videoAccessibleMenu = {};

        _initialize(state);
        dfd.resolve();
        return dfd.promise();
    };

    // ***************************************************************
    // Private functions start here.
    // ***************************************************************

    function _initialize(state) {
        _makeFunctionsPublic(state);
        _renderElements(state);
        _bindHandlers(state);
    }

    // function _makeFunctionsPublic(state)
    //
    //     Functions which will be accessible via 'state' object. When called,
    //     these functions will get the 'state' object as a context.
    function _makeFunctionsPublic(state) {
        var methodsDict = {
            changeFileType: changeFileType
        };

        state.bindTo(methodsDict, state.videoAccessibleMenu, state);
    }

    // function _renderElements(state)
    //
    //     Create any necessary DOM elements, attach them, and set their
    //     initial configuration. Also make the created DOM elements available
    //     via the 'state' object. Much easier to work this way - you don't
    //     have to do repeated jQuery element selects.
    function _renderElements(state) {

        var container = state.el.find('li.video-tracks>div.menu-container'),
            button = container.children('a.menu-button'),
            menu = container.children('ol.menu'),
            menuItems = menu.children('li.menu-item'),
            menuItemsLinks = menuItems.children('a.menu-item-link');

        state.videoAccessibleMenu.container = container;
        state.videoAccessibleMenu.button = button;
        state.videoAccessibleMenu.menu = menu;
        state.videoAccessibleMenu.menuItems = menuItems;
        state.videoAccessibleMenu.menuItemsLinks = menuItemsLinks;
    }

    // Hide accessible menu.
    function _hideAccessibleMenu(state) {
        state.videoAccessibleMenu.container.hide();
    }

    // Get previous element in array or cyles back to the last if it is the
    // first.
    function _previousMenuItemLink(links, index) {
        return $(links.eq(index < 1 ? links.length - 1 : index - 1));
    }

    // Get next element in array or cyles back to the first if it is the last.
    function _nextMenuItemLink(links, index) {
        return $(links.eq(index >= links.length - 1 ? 0 : index + 1));
    }

    function _menuItemsLinksFocused(state) {
        return state.videoAccessibleMenu.menuItemsLinks.is(':focus');
    }

    function _openMenu(state) {
        // When menu items have focus, the menu stays open on
        // mouseleave. A clickHandler is added to the window
        // element to have clicks close the menu when they happen
        // outside of it. We namespace the click event to easily remove it (and
        // only it) in _closeMenu.
        $(window).on('click.currentMenu', _clickHandler.bind(state));
        state.videoAccessibleMenu.container.addClass('open');
    }

    function _closeMenu(state) {
        // Remove the previously added clickHandler from window element.
        $(window).off('click.currentMenu');
        state.videoAccessibleMenu.container.removeClass('open');
    }

    // Various event handlers. They all return false to stop propagation and
    // prevent default behavior.
    function _clickHandler(event) {
        var target = $(event.currentTarget);

        this.videoAccessibleMenu.container.removeClass('open');
        if (target.is('a.menu-item-link')) {
            this.videoAccessibleMenu.changeFileType.call(this, event);
        }

        return false;
    }

    // We do not use _openMenu and _closeMenu in the following two handlers
    // because we do not want to add an unnecessary clickHandler to the window
    // element.
    function _mouseEnterHandler(event) {
        this.videoAccessibleMenu.container.addClass('open');

        return false;
    }

    function _mouseLeaveHandler(event) {
        // Only close the menu if no menu item link has focus.
        if (!_menuItemsLinksFocused(this)) {
            this.videoAccessibleMenu.container.removeClass('open');
        }
                
        return false;
    }

    function _keyDownHandler(event) {
        var KEY = $.ui.keyCode,
            keyCode = event.keyCode,
            target = $(event.currentTarget),
            button = this.videoAccessibleMenu.button,
            menuItemsLinks = this.videoAccessibleMenu.menuItemsLinks,
            index;

        if (target.is('a.menu-item-link')) {

            index = target.parent().index();

            switch (keyCode) {
                // Scroll up menu, wrapping at the top. Keep menu open.
                case KEY.UP:
                    _previousMenuItemLink(menuItemsLinks, index).focus();
                    break;
                // Scroll down  menu, wrapping at the bottom. Keep menu
                // open.
                case KEY.DOWN:
                    _nextMenuItemLink(menuItemsLinks, index).focus();
                    break;
                // Close menu.
                case KEY.TAB:
                    _closeMenu(this);
                    // TODO
                    // What has to happen here? In speed menu, tabbing backward
                    // will give focus to Play/Pause button and tabbing
                    // forward to Volume button.
                    break;
                // Close menu, give focus to button and change
                // file type.
                case KEY.ENTER:
                case KEY.SPACE:
                    _closeMenu(this);
                    button.focus();
                    this.videoAccessibleMenu.changeFileType.call(this, event);
                    break;
                // Close menu and give focus to speed control.
                case KEY.ESCAPE:
                    _closeMenu(this);
                    button.focus();
                    break;
            }
            return false;
        }
        else {
            switch(keyCode) {
                // Open menu and focus on last element of list above it.
                case KEY.ENTER:
                case KEY.SPACE:
                case KEY.UP:
                    _openMenu(this);
                    menuItemsLinks.last().focus();
                    break;
                // Close menu.
                case KEY.ESCAPE:
                    _closeMenu(this);
                    break;
            }
            // We do not stop propagation and default behavior on a TAB
            // keypress.
            return event.keyCode === KEY.TAB;
        }
    }

    /**
     * @desc Bind any necessary function callbacks to DOM events (click,
     *     mousemove, etc.).
     *
     * @type {function}
     * @access private
     *
     * @param {object} state The object containg the state of the video player.
     *     All other modules, their parameters, public variables, etc. are
     *     available via this object.
     *
     * @this {object} The global window object.
     *
     * @returns {undefined}
     */
    function _bindHandlers(state) {
        var container = state.videoAccessibleMenu.container,
            menuItems = state.videoAccessibleMenu.menuItems;

        // Attach various events handlers to menu container.
        container.on({
            'mouseenter': _mouseEnterHandler.bind(state),
            'mouseleave': _mouseLeaveHandler.bind(state),
            'click': _clickHandler.bind(state),
            'keydown': _keyDownHandler.bind(state)
        });

        // Attach click and keydown event handlers to individual menu items.
        menuItems.on('click', 'a.menu-item-link', _clickHandler.bind(state))
                 .on('keydown', 'a.menu-item-link', _keyDownHandler.bind(state));
    }

    // ***************************************************************
    // Public functions start here.
    // These are available via the 'state' object. Their context ('this'
    // keyword) is the 'state' object. The magic private function that makes
    // them available and sets up their context is makeFunctionsPublic().
    // ***************************************************************

    function changeFileType(event) {
        var fileType = $(event.currentTarget).data('value'),
            button =  this.videoAccessibleMenu.button,
            menuItems = this.videoAccessibleMenu.menuItems;

        this.saveState(true, {'transcript_format': fileType});
        menuItems.removeClass('active');
        menuItems.find("a[data-value='" + fileType + "']").parent()
            .addClass('active');
        button.html('.' + fileType);
    }

});

}(RequireJS.requirejs, RequireJS.require, RequireJS.define));
