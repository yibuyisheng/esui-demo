define([
    'require',
    './lib',
    './main',
    './Panel',
    'underscore',
    './painters'
], function (require) {
    var lib = require('./lib');
    var ui = require('./main');
    var Panel = require('./Panel');
    var u = require('underscore');
    function Overlay(options) {
        Panel.apply(this, arguments);
    }
    lib.inherits(Overlay, Panel);
    Overlay.prototype.type = 'Overlay';
    Overlay.prototype.parseMain = function (options) {
        var main = options.main;
        if (!main) {
            return;
        }
        var els = lib.getChildren(main);
        var len = els.length;
        var roleName;
        var roles = {};
        while (len--) {
            roleName = els[len].getAttribute('data-role');
            if (roleName) {
                roles[roleName] = els[len];
            }
        }
        options.roles = roles;
    };
    Overlay.prototype.initOptions = function (options) {
        var properties = {
                fixed: false,
                autoClose: true,
                hasMask: false
            };
        var booleanProperties = [
                'fixed',
                'autoClose',
                'hasMask'
            ];
        u.each(booleanProperties, function (property) {
            if (options[property] === 'false') {
                options[property] = false;
            }
        });
        u.extend(properties, options);
        Panel.prototype.initOptions.call(this, properties);
    };
    Overlay.prototype.initStructure = function () {
        var main = this.main;
        if (main.parentNode && main.parentNode.nodeName.toLowerCase() !== 'body') {
            document.body.appendChild(main);
        }
        this.addState('hidden');
        Panel.prototype.initStructure.apply(this, arguments);
    };
    Overlay.prototype.repaint = require('./painters').createRepaint(Panel.prototype.repaint, {
        name: [
            'height',
            'width'
        ],
        paint: function (overlay, width, height) {
            if (!isPropertyEmpty(width)) {
                if (width === 'auto') {
                    overlay.main.style.width = 'auto';
                } else {
                    overlay.main.style.width = width + 'px';
                }
            }
            if (!isPropertyEmpty(height)) {
                if (height === 'auto') {
                    overlay.main.style.height = 'auto';
                } else {
                    overlay.main.style.height = height + 'px';
                }
            }
            if (!overlay.isHidden()) {
                autoLayout.apply(overlay);
            }
        }
    }, {
        name: [
            'attachedDOM',
            'attachedControl'
        ],
        paint: function (overlay, attachedDOM, attachedControl) {
            var targetDOM = getTargetDOM.call(overlay, attachedDOM, attachedControl);
            overlay.attachedTarget = targetDOM;
        }
    });
    function close(e) {
        var target = e.target;
        var layer = this.main;
        if (!layer) {
            return;
        }
        var isChild = lib.dom.contains(layer, target);
        if (!isChild) {
            this.hide();
        }
    }
    Overlay.prototype.show = function () {
        if (this.helper.isInStage('INITED')) {
            this.render();
        } else if (this.helper.isInStage('DISPOSED')) {
            return;
        }
        if (this.autoClose) {
            this.helper.addDOMEvent(document, 'mousedown', close);
        }
        if (this.fixed) {
            this.helper.addDOMEvent(window, 'resize', resizeHandler);
            this.helper.addDOMEvent(window, 'scroll', resizeHandler);
        }
        this.removeState('hidden');
        if (this.hasMask) {
            showMask.call(this);
        }
        this.moveToTop();
        autoLayout.apply(this);
        this.fire('show');
    };
    Overlay.prototype.hide = function () {
        if (!this.isHidden()) {
            if (this.autoClose) {
                this.helper.removeDOMEvent(document, 'mousedown', close);
            }
            this.helper.removeDOMEvent(window, 'resize', resizeHandler);
            this.helper.removeDOMEvent(window, 'scroll', resizeHandler);
            this.addState('hidden');
            if (this.hasMask) {
                hideMask.call(this);
            }
        }
        this.fire('hide');
    };
    Overlay.prototype.moveToTop = function () {
        var zIndex = this.getZIndex();
        this.main.style.zIndex = zIndex;
        var mask = getMask.call(this);
        if (mask) {
            mask.style.zIndex = zIndex - 1;
        }
    };
    Overlay.prototype.getZIndex = function () {
        var primaryClassName = this.helper.getPrimaryClassName();
        var hiddenPrimaryClassName = this.helper.getPrimaryClassName('hidden');
        var zIndex = 1203;
        var rawElements = lib.getChildren(document.body);
        for (var i = 0, len = rawElements.length; i < len; i++) {
            if (lib.hasClass(rawElements[i], primaryClassName) && !lib.hasClass(rawElements[i], hiddenPrimaryClassName)) {
                zIndex = Math.max(zIndex, rawElements[i].style.zIndex) + 10;
            }
        }
        return zIndex;
    };
    function autoLayout() {
        var attachedTarget = this.attachedTarget;
        var attachedLayout = this.attachedLayout;
        if (attachedTarget != null) {
            if (u.isString(attachedLayout)) {
                attachedLayout = attachedLayout.split(',');
            }
            this.attachLayout(attachedTarget, attachedLayout);
        } else {
            var options = u.pick(this, 'left', 'right', 'top', 'bottom', 'width', 'height');
            this.selfLayout(options);
        }
    }
    function getTargetDOM(domId, control) {
        if (domId) {
            return lib.g(domId);
        } else if (control) {
            if (u.isString(control)) {
                control = this.viewContext.get(control) || {};
            }
            return control.main;
        }
        return null;
    }
    function renderLayer(options) {
        var main = this.main;
        var properties = lib.clone(options || {});
        if (u.isArray(properties.align)) {
            lib.addClass(main, this.helper.getPartClasses(properties.align.join('-')));
        }
        properties = u.omit(properties, 'align');
        main.style.top = '';
        main.style.bottom = '';
        main.style.left = '';
        main.style.right = '';
        u.each(properties, function (value, name) {
            if (!isPropertyEmpty(value)) {
                main.style[name] = value + 'px';
            }
        });
    }
    function isPropertyEmpty(properties, key) {
        if (key) {
            if (!properties.hasOwnProperty(key)) {
                return true;
            }
            properties = properties[key];
        }
        return properties == null || properties !== 0 && lib.trim(properties) === '';
    }
    function getStyleNum(dom, styleName) {
        var result = lib.getStyle(dom, styleName);
        return parseInt(result, 10) || 0;
    }
    Overlay.prototype.selfLayout = function (options) {
        var page = lib.page;
        var main = this.main;
        var properties = lib.clone(options || {});
        var layerPosition = lib.getOffset(main);
        if (isPropertyEmpty(properties, 'left') && isPropertyEmpty(properties, 'right')) {
            properties.left = (page.getViewWidth() - layerPosition.width) / 2;
        } else if (!isPropertyEmpty(properties, 'left') && !isPropertyEmpty(properties, 'right')) {
            if (isPropertyEmpty(properties, 'width')) {
                properties.width = page.getViewWidth() - properties.right - properties.left - getStyleNum(this.main, 'padding-left') - getStyleNum(this.main, 'padding-right') - getStyleNum(this.main, 'border-left-width') - getStyleNum(this.main, 'border-right-width');
            }
            properties = u.omit(properties, 'right');
        }
        properties.left = Math.max(properties.left, 0);
        properties.left = page.getScrollLeft() + properties.left;
        if (isPropertyEmpty(properties, 'top') && isPropertyEmpty(properties, 'bottom')) {
            properties.top = (page.getViewHeight() - layerPosition.height) / 2;
        } else if (!isPropertyEmpty(properties, 'top') && !isPropertyEmpty(properties, 'bottom')) {
            if (isPropertyEmpty(properties, 'height')) {
                properties.height = page.getViewHeight() - properties.top - properties.bottom - getStyleNum(this.main, 'padding-top') - getStyleNum(this.main, 'padding-bottom') - getStyleNum(this.main, 'border-top-width') - getStyleNum(this.main, 'border-bottom-width');
            }
            properties = u.omit(properties, 'bottom');
        }
        properties.top = Math.max(properties.top, 0);
        properties.top = page.getScrollTop() + properties.top;
        renderLayer.call(this, properties);
    };
    Overlay.prototype.attachLayout = function (target, options) {
        var main = this.main;
        options = options || [
            'bottom',
            'left'
        ];
        var pagePosition = {
                width: lib.page.getViewWidth(),
                height: lib.page.getViewHeight(),
                scrollTop: lib.page.getScrollTop(),
                scrollLeft: lib.page.getScrollLeft()
            };
        var rect = target.getBoundingClientRect();
        var targetOffset = lib.getOffset(target);
        var targetPosition = {
                layoutLeft: targetOffset.left,
                viewLeft: rect.left,
                layoutTop: targetOffset.top,
                viewTop: rect.top,
                layoutRight: targetOffset.right,
                viewRight: rect.right,
                layoutBottom: targetOffset.bottom,
                viewBottom: rect.bottom,
                width: targetOffset.width,
                height: targetOffset.height
            };
        if (this.strictWidth) {
            main.style.minWidth = targetOffset.width + 'px';
        }
        var previousDisplayValue = main.style.display;
        main.style.display = 'block';
        main.style.top = '-5000px';
        main.style.left = '-5000px';
        var layerPosition = lib.getOffset(main);
        main.style.top = '';
        main.style.left = '';
        main.style.display = previousDisplayValue;
        var positionOptions = {
                target: targetPosition,
                layer: layerPosition,
                page: pagePosition
            };
        var properties;
        if (options[0] === 'right' || options[0] === 'left') {
            properties = positionHorizontal(positionOptions, options);
        } else {
            properties = positionVertical(positionOptions, options);
        }
        renderLayer.call(this, properties);
    };
    function positionHorizontal(options, preference) {
        var spaceRight = options.page.width - options.target.viewRight;
        var spaceLeft = options.target.viewLeft;
        var spaceBottomToTop = options.target.viewBottom;
        var spaceTopToBottom = options.page.height - options.target.viewTop;
        var validConfig = {};
        if (spaceRight >= options.layer.width) {
            validConfig.right = true;
        }
        if (spaceLeft >= options.layer.width) {
            validConfig.left = true;
        }
        if (spaceBottomToTop >= options.layer.height) {
            validConfig.bottom = true;
        }
        if (spaceTopToBottom >= options.layer.height) {
            validConfig.top = true;
        }
        var positionConfig = {
                right: options.target.layoutRight,
                left: options.target.layoutLeft - options.layer.width,
                bottom: options.target.layoutBottom - options.layer.height,
                top: options.target.layoutTop,
                center: options.target.layoutTop - (options.layer.height - options.target.height) * 1 / 2
            };
        var properties = { align: [] };
        if (validConfig[preference[0]] === true) {
            properties.left = positionConfig[preference[0]];
            properties.align.push(preference[0]);
        } else {
            properties.left = positionConfig.right;
            properties.align.push('right');
        }
        if (preference[1] === 'center') {
            properties.top = positionConfig.center;
            properties.align.push('center');
        } else if (validConfig[preference[1]] === true) {
            properties.top = positionConfig[preference[1]];
            properties.align.push(preference[1]);
        } else {
            properties.top = positionConfig.top;
            properties.align.push('top');
        }
        return properties;
    }
    function positionVertical(options, preference) {
        var spaceRightToLeft = options.target.viewRight;
        var spaceLeftToRight = options.page.width - options.target.viewLeft;
        var spaceTop = options.target.viewTop;
        var spaceBottom = options.page.height - options.target.viewBottom;
        var validConfig = {};
        if (spaceRightToLeft >= options.layer.width) {
            validConfig.right = true;
        }
        if (spaceLeftToRight >= options.layer.width) {
            validConfig.left = true;
        }
        if (spaceBottom >= options.layer.height) {
            validConfig.bottom = true;
        }
        if (spaceTop >= options.layer.height) {
            validConfig.top = true;
        }
        var positionConfig = {
                right: options.target.layoutRight - options.layer.width,
                left: options.target.layoutLeft,
                center: options.target.layoutLeft - (options.layer.width - options.target.width) * 1 / 2,
                bottom: options.target.layoutBottom,
                top: options.target.layoutTop - options.layer.height
            };
        var properties = { align: [] };
        if (validConfig[preference[0]] === true) {
            properties.top = positionConfig[preference[0]];
            properties.align.push(preference[0]);
        } else {
            properties.top = positionConfig.bottom;
            properties.align.push('bottom');
        }
        if (preference[1] === 'center') {
            properties.left = positionConfig.center;
            properties.align.push('center');
        } else if (validConfig[preference[1]] === true) {
            properties.left = positionConfig[preference[1]];
            properties.align.push(preference[1]);
        } else {
            properties.left = positionConfig.left;
            properties.align.push('left');
        }
        return properties;
    }
    Overlay.prototype.moveTo = function (top, left) {
        this.selfLayout({
            top: top,
            left: left
        });
    };
    Overlay.prototype.resize = function () {
        autoLayout.apply(this);
    };
    Overlay.prototype.dispose = function () {
        if (this.helper.isInStage('DISPOSED')) {
            return;
        }
        lib.removeNode('ctrl-mask-' + this.helper.getId());
        lib.removeNode(this.main);
        Panel.prototype.dispose.apply(this, arguments);
    };
    function resizeHandler() {
        if (this.isHidden()) {
            return;
        }
        autoLayout.apply(this);
    }
    function initMask(maskId) {
        var maskElement = document.createElement('div');
        maskElement.id = maskId;
        document.body.appendChild(maskElement);
    }
    function getMask() {
        var id = 'ctrl-mask-' + this.helper.getId();
        var mask = lib.g(id);
        if (!mask) {
            initMask(id);
        }
        return lib.g(id);
    }
    function showMask() {
        var mask = getMask.call(this);
        var maskClass = this.helper.getPartClassName('mask');
        mask.className = maskClass;
        mask.style.display = 'block';
    }
    function hideMask() {
        var mask = getMask.call(this);
        if ('undefined' !== typeof mask) {
            lib.removeNode(mask);
        }
    }
    ui.register(Overlay);
    return Overlay;
});