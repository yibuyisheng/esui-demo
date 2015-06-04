define([
    'require',
    './Button',
    './Label',
    './Panel',
    'underscore',
    './lib',
    './controlHelper',
    './Control',
    './main',
    './painters'
], function (require) {
    require('./Button');
    require('./Label');
    require('./Panel');
    var u = require('underscore');
    var lib = require('./lib');
    var helper = require('./controlHelper');
    var Control = require('./Control');
    var ui = require('./main');
    var paint = require('./painters');
    var DEFAULT_DELAY_SHOW = 0;
    var DEFAULT_DELAY_HIDE = 150;
    function TipLayer(options) {
        Control.apply(this, arguments);
    }
    function parseMain(options) {
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
    }
    function createHead(tipLayer, mainDOM) {
        if (mainDOM) {
            tipLayer.title = mainDOM.innerHTML;
        } else {
            mainDOM = document.createElement('h3');
            if (tipLayer.main.firstChild) {
                lib.insertBefore(mainDOM, tipLayer.main.firstChild);
            } else {
                tipLayer.main.appendChild(mainDOM);
            }
        }
        var headClasses = [].concat(tipLayer.helper.getPartClasses('title'));
        lib.addClasses(mainDOM, headClasses);
        var properties = {
                main: mainDOM,
                childName: 'title'
            };
        var label = ui.create('Label', properties);
        label.render();
        tipLayer.addChild(label);
        return label;
    }
    function createBF(tipLayer, type, mainDOM) {
        if (mainDOM) {
            tipLayer.content = mainDOM.innerHTML;
        } else {
            mainDOM = document.createElement('div');
            if (type === 'body') {
                var head = tipLayer.getChild('title');
                if (head) {
                    lib.insertAfter(mainDOM, head.main);
                } else if (tipLayer.main.firstChild) {
                    lib.insertBefore(mainDOM, head, tipLayer.main.firstChild);
                } else {
                    tipLayer.main.appendChild(mainDOM);
                }
            } else {
                tipLayer.main.appendChild(mainDOM);
            }
        }
        lib.addClasses(mainDOM, tipLayer.helper.getPartClasses(type + '-panel'));
        var properties = {
                main: mainDOM,
                renderOptions: tipLayer.renderOptions
            };
        var panel = ui.create('Panel', properties);
        panel.render();
        tipLayer.addChild(panel, type);
        return panel;
    }
    function resizeHandler(tipLayer, targetElement, options) {
        if (!tipLayer.isShow) {
            return;
        }
        tipLayer.autoPosition(targetElement, options);
    }
    function delayShow(tipLayer, delayTime, targetElement, options) {
        if (delayTime) {
            clearTimeout(tipLayer.showTimeout);
            clearTimeout(tipLayer.hideTimeout);
            tipLayer.showTimeout = setTimeout(lib.bind(tipLayer.show, tipLayer, targetElement, options), delayTime);
        } else {
            tipLayer.show(targetElement, options);
        }
    }
    function delayHide(tipLayer, delayTime) {
        clearTimeout(tipLayer.showTimeout);
        clearTimeout(tipLayer.hideTimeout);
        tipLayer.hideTimeout = setTimeout(lib.bind(tipLayer.hide, tipLayer), delayTime);
    }
    function getElementByControl(tipLayer, control) {
        if (typeof control === 'string') {
            control = tipLayer.viewContext.get(control);
        }
        return control.main;
    }
    function enableOutsideClickHide(handler) {
        this.helper.addDOMEvent(document.documentElement, 'mouseup', handler.layer.clickOutsideHideHandler);
        this.helper.addDOMEvent(this.main, 'mouseup', handler.layer.preventPopMethod);
    }
    function disableOutsideClickHide(handler) {
        this.helper.removeDOMEvent(document.documentElement, 'mouseup', handler.layer.clickOutsideHideHandler);
        this.helper.removeDOMEvent(this.main, 'mouseup', handler.layer.clickOutsideHideHandler);
    }
    TipLayer.prototype = {
        type: 'TipLayer',
        initOptions: function (options) {
            parseMain(options);
            var properties = {
                    roles: {},
                    showMode: 'manual'
                };
            lib.extend(properties, options);
            this.setProperties(properties);
        },
        initStructure: function () {
            var main = this.main;
            if (main.parentNode && main.parentNode.nodeName.toLowerCase() !== 'body') {
                document.body.appendChild(main);
            }
            this.main.style.left = '-10000px';
            if (this.title || this.roles.title) {
                createHead(this, this.roles.title);
            }
            createBF(this, 'body', this.roles.content);
            if (this.foot || this.roles.foot) {
                createBF(this, 'foot', this.roles.foot);
            }
            if (this.arrow) {
                var arrow = document.createElement('div');
                arrow.id = helper.getId(this, 'arrow');
                arrow.className = helper.getPartClasses(this, 'arrow').join(' ');
                this.main.appendChild(arrow);
            }
        },
        repaint: helper.createRepaint(Control.prototype.repaint, paint.style('width'), {
            name: 'title',
            paint: function (tipLayer, value) {
                var head = tipLayer.getHead();
                if (value == null) {
                    if (head) {
                        tipLayer.removeChild(head);
                    }
                } else {
                    if (!head) {
                        head = createHead(tipLayer);
                    }
                    head.setText(value);
                }
            }
        }, {
            name: 'content',
            paint: function (tipLayer, value) {
                var bfTpl = '' + '<div class="${class}" id="${id}">' + '${content}' + '</div>';
                var body = tipLayer.getBody();
                var bodyId = helper.getId(tipLayer, 'body');
                var bodyClass = helper.getPartClasses(tipLayer, 'body');
                var data = {
                        'class': bodyClass.join(' '),
                        'id': bodyId,
                        'content': value
                    };
                body.setContent(lib.format(bfTpl, data));
            }
        }, {
            name: 'foot',
            paint: function (tipLayer, value) {
                var bfTpl = '' + '<div class="${class}" id="${id}">' + '${content}' + '</div>';
                var footId = helper.getId(tipLayer, 'foot');
                var footClass = helper.getPartClasses(tipLayer, 'foot');
                var foot = tipLayer.getFoot();
                if (value == null) {
                    if (foot) {
                        tipLayer.removeChild(foot);
                    }
                } else {
                    var data = {
                            'class': footClass.join(' '),
                            'id': footId,
                            'content': value
                        };
                    if (!foot) {
                        foot = createBF(tipLayer, 'foot');
                    }
                    foot.setContent(lib.format(bfTpl, data));
                }
            }
        }, {
            name: [
                'targetDOM',
                'targetControl',
                'showMode',
                'positionOpt',
                'delayTime',
                'showDuration'
            ],
            paint: function (tipLayer, targetDOM, targetControl, showMode, positionOpt, delayTime, showDuration) {
                var options = {
                        targetDOM: targetDOM,
                        targetControl: targetControl,
                        showMode: showMode,
                        delayTime: delayTime != null ? delayTime : DEFAULT_DELAY_SHOW,
                        showDuration: showDuration != null ? showDuration : DEFAULT_DELAY_HIDE
                    };
                if (positionOpt) {
                    positionOpt = positionOpt.split('|');
                    options.positionOpt = {
                        top: positionOpt[0] || 'top',
                        right: positionOpt[1] || 'left'
                    };
                }
                if (showMode !== 'manual') {
                    tipLayer.attachTo(options);
                }
            }
        }),
        autoPosition: function (target, options) {
            var tipLayer = this;
            var element = this.main;
            options = options || {
                left: 'right',
                top: 'top'
            };
            var rect = target.getBoundingClientRect();
            var offset = lib.getOffset(target);
            var targetPosition = {
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.right - rect.left,
                    height: rect.bottom - rect.top
                };
            var previousDisplayValue = element.style.display;
            element.style.display = 'block';
            var elementHeight = element.offsetHeight;
            var elementWidth = element.offsetWidth;
            element.style.display = 'none';
            var config = u.omit(options, 'targetControl');
            var viewWidth = lib.page.getViewWidth();
            var viewHeight = lib.page.getViewHeight();
            var gapLR = targetPosition.left - elementWidth;
            var gapRL = viewWidth - targetPosition.right - elementWidth;
            var gapTT = viewHeight - targetPosition.top - elementHeight;
            var gapBB = targetPosition.bottom - elementHeight;
            if (gapLR >= 0) {
                if (gapRL >= 0) {
                    if (!config.right && !config.left) {
                        if (gapRL < gapLR) {
                            config.left = 'right';
                            config.right = null;
                        } else {
                            config.right = 'left';
                            config.left = null;
                        }
                    }
                } else {
                    config.left = 'right';
                    config.right = null;
                }
            } else {
                config.right = 'left';
                config.left = null;
            }
            if (gapTT >= 0) {
                if (gapBB >= 0) {
                    if (!config.bottom && !config.top) {
                        if (gapBB < gapTT) {
                            config.top = 'top';
                            config.bottom = null;
                        } else {
                            config.bottom = 'bottom';
                            config.top = null;
                        }
                    }
                } else {
                    config.top = 'top';
                    config.bottom = null;
                }
            } else {
                config.bottom = 'bottom';
                config.top = null;
            }
            var properties = {};
            var arrowClass;
            if (config.right) {
                properties.left = offset.right;
                if (config.top) {
                    arrowClass = 'lt';
                } else {
                    arrowClass = 'lb';
                }
            } else if (config.left) {
                properties.left = offset.left - elementWidth;
                if (config.top) {
                    arrowClass = 'rt';
                } else {
                    arrowClass = 'rb';
                }
            }
            if (config.top) {
                properties.top = offset.top;
            } else if (config.bottom) {
                properties.top = offset.bottom - elementHeight;
            }
            element.style.display = previousDisplayValue;
            element.className = '' + tipLayer.helper.getPartClassName() + ' ' + tipLayer.helper.getPartClassName(arrowClass);
            var arrow = tipLayer.helper.getPart('arrow');
            if (arrow) {
                arrow.className = '' + tipLayer.helper.getPartClassName('arrow') + ' ' + tipLayer.helper.getPartClassName('arrow' + '-' + arrowClass);
            }
            tipLayer.renderLayer(element, properties);
        },
        renderLayer: function (element, options) {
            var properties = lib.clone(options || {});
            if (properties.hasOwnProperty('top') && properties.hasOwnProperty('bottom')) {
                properties.height = properties.bottom - properties.top;
                delete properties.bottom;
            }
            if (properties.hasOwnProperty('left') && properties.hasOwnProperty('right')) {
                properties.width = properties.right - properties.left;
                delete properties.right;
            }
            if (properties.hasOwnProperty('top') || properties.hasOwnProperty('bottom')) {
                element.style.top = '';
                element.style.bottom = '';
            }
            if (properties.hasOwnProperty('left') || properties.hasOwnProperty('right')) {
                element.style.left = '';
                element.style.right = '';
            }
            for (var name in properties) {
                if (properties.hasOwnProperty(name)) {
                    element.style[name] = properties[name] + 'px';
                }
            }
        },
        attachTo: function (options) {
            var handler = this.getInitHandler(options);
            if (!handler) {
                return;
            }
            options.handler = handler;
            switch (options.showMode) {
            case 'auto':
                this.initAutoMode(options);
                break;
            case 'over':
                this.initOverMode(options);
                break;
            case 'click':
                this.initClickMode(options);
                break;
            case 'manual':
                break;
            }
        },
        getInitHandler: function (options) {
            var me = this;
            var targetElement;
            if (options.targetDOM) {
                targetElement = lib.g(options.targetDOM);
            } else if (options.targetControl) {
                targetElement = getElementByControl(this, options.targetControl);
            }
            if (!targetElement) {
                return null;
            }
            var handler = {
                    targetElement: targetElement,
                    layer: {
                        show: function () {
                            if (options.showMode === 'over') {
                                me.helper.removeDOMEvent(me.main, 'mouseover');
                                me.helper.removeDOMEvent(me.main, 'mouseout');
                                me.helper.addDOMEvent(me.main, 'mouseover', u.bind(me.show, me, targetElement, options.positionOpt));
                                me.helper.addDOMEvent(me.main, 'mouseout', function () {
                                    handler.layer.hide();
                                });
                            }
                            delayShow(me, options.delayTime, targetElement, options.positionOpt);
                        },
                        hide: lib.curry(delayHide, me, options.delayTime),
                        bind: function (showEvent, callback) {
                            showEvent = showEvent || 'mouseup';
                            me.helper.addDOMEvent(targetElement, showEvent, function (e) {
                                handler.layer.show();
                                if (typeof callback === 'function') {
                                    callback();
                                }
                                e.stopPropagation();
                            });
                        },
                        preventPopMethod: function (e) {
                            e.stopPropagation();
                        },
                        clickOutsideHideHandler: function (e) {
                            handler.layer.hide();
                        },
                        enableOutsideClickHide: function () {
                            enableOutsideClickHide.call(me, handler);
                        },
                        disableOutsideClickHide: function () {
                            disableOutsideClickHide.call(me, handler);
                        }
                    }
                };
            return handler;
        },
        initAutoMode: function (options) {
            var handler = options.handler;
            handler.layer.show();
            if (!options.showDuration) {
                handler.layer.enableOutsideClickHide();
            } else {
                handler.layer.hide(options.showDuration);
            }
            handler.layer.bind('mouseup');
        },
        initClickMode: function (options) {
            var handler = options.handler;
            handler.layer.bind('mouseup');
            handler.layer.enableOutsideClickHide();
        },
        initOverMode: function (options) {
            var handler = options.handler;
            handler.layer.bind('mouseover');
            this.helper.addDOMEvent(handler.targetElement, 'mouseout', function () {
                handler.layer.hide();
            });
        },
        getHead: function () {
            return this.getChild('title');
        },
        getBody: function () {
            return this.getChild('body');
        },
        getFoot: function () {
            return this.getChild('foot');
        },
        show: function (targetElement, options) {
            if (helper.isInStage(this, 'INITED')) {
                this.render();
            } else if (helper.isInStage(this, 'DISPOSED')) {
                return;
            }
            clearTimeout(this.hideTimeout);
            helper.addDOMEvent(this, window, 'resize', lib.curry(resizeHandler, this, targetElement, options));
            this.main.style.zIndex = helper.layer.getZIndex(targetElement);
            this.removeState('hidden');
            this.autoPosition(targetElement, options);
            if (this.isShow) {
                return;
            }
            this.isShow = true;
            this.fire('show');
        },
        hide: function () {
            if (!this.isShow) {
                return;
            }
            this.isShow = false;
            this.addState('hidden');
            this.fire('hide');
        },
        setTitle: function (html) {
            this.setProperties({ 'title': html });
        },
        setContent: function (content) {
            this.setProperties({ 'content': content });
        },
        setFoot: function (foot) {
            this.setProperties({ 'foot': foot });
        },
        dispose: function () {
            if (helper.isInStage(this, 'DISPOSED')) {
                return;
            }
            this.hide();
            var domId = this.main.id;
            lib.removeNode(domId);
            Control.prototype.dispose.apply(this, arguments);
        }
    };
    TipLayer.onceNotice = function (args) {
        var tipLayerPrefix = 'tipLayer-once-notice';
        var okPrefix = 'tipLayer-notice-ok';
        function btnClickHandler(tipLayer) {
            var handler = tipLayer.onok;
            var isFunc = typeof handler === 'function';
            if (isFunc) {
                handler(tipLayer);
            }
            tipLayer.fire('ok');
            tipLayer.dispose();
        }
        var content = lib.encodeHTML(args.content) || '';
        var properties = {
                type: 'onceNotice',
                skin: 'onceNotice',
                arrow: true
            };
        lib.extend(properties, args);
        var main = document.createElement('div');
        document.body.appendChild(main);
        var tipLayerId = helper.getGUID(tipLayerPrefix);
        properties.id = tipLayerId;
        properties.main = main;
        properties.type = null;
        var tipLayer = ui.create('TipLayer', properties);
        tipLayer.setContent(content);
        var okText = args.okText || '\u77E5\u9053\u4E86';
        tipLayer.setFoot('' + '<div data-ui="type:Button;childName:okBtn;id:' + tipLayerId + '-' + okPrefix + ';width:50;"' + 'class="' + helper.getPartClasses(tipLayer, 'once-notice') + '">' + okText + '</div>');
        tipLayer.render();
        var okBtn = tipLayer.getFoot().getChild('okBtn');
        okBtn.on('click', lib.curry(btnClickHandler, tipLayer, 'ok'));
        var targetDOM = lib.g(args.targetDOM) || tipLayer.viewContext.get(args.targetControl);
        tipLayer.show(targetDOM, {
            top: 'top',
            right: 'left'
        });
        return tipLayer;
    };
    lib.inherits(TipLayer, Control);
    ui.register(TipLayer);
    return TipLayer;
});