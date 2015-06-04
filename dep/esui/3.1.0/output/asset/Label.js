define([
    'require',
    'underscore',
    './lib',
    './Control',
    './painters',
    './main'
], function (require) {
    var u = require('underscore');
    var lib = require('./lib');
    var Control = require('./Control');
    function Label(options) {
        Control.apply(this, arguments);
    }
    Label.prototype.type = 'Label';
    Label.prototype.createMain = function (options) {
        if (!options.tagName) {
            return Control.prototype.createMain.call(this);
        }
        return document.createElement(options.tagName);
    };
    Label.prototype.initOptions = function (options) {
        var properties = { title: '' };
        u.extend(properties, options);
        properties.tagName = this.main.nodeName.toLowerCase();
        if (properties.text == null) {
            properties.text = lib.trim(lib.getText(this.main));
        }
        u.extend(this, properties);
    };
    Label.prototype.initEvents = function () {
        this.helper.delegateDOMEvent(this.main, 'click');
    };
    var paint = require('./painters');
    Label.prototype.repaint = paint.createRepaint(Control.prototype.repaint, paint.attribute('title'), paint.text('text'), {
        name: 'forTarget',
        paint: function (label, forTarget) {
            if (label.main.nodeName.toLowerCase() !== 'label') {
                return;
            }
            label.helper.addDOMEvent(label.main, 'mousedown', function fixForAttribute() {
                var targetControl = this.viewContext.get(forTarget);
                var targetElement = targetControl && typeof targetControl.getFocusTarget === 'function' && targetControl.getFocusTarget();
                if (targetElement && targetElement.id) {
                    lib.setAttribute(this.main, 'for', targetElement.id);
                }
                this.helper.removeDOMEvent(this.main, 'mousedown', fixForAttribute);
            });
        }
    });
    Label.prototype.setText = function (text) {
        this.setProperties({ text: text });
    };
    Label.prototype.getText = function () {
        return this.text;
    };
    Label.prototype.setTitle = function (title) {
        this.setProperties({ title: title });
    };
    Label.prototype.getTitle = function () {
        return this.title;
    };
    lib.inherits(Label, Control);
    require('./main').register(Label);
    return Label;
});