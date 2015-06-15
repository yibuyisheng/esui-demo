/**
 * @file 列表类型`Action`基类
 * @author Justineo(justice360@gmail.com)
 */

define(function (require) {
    var BaseAction = require('./BaseAction');
    var u = require('underscore');
    var URL = require('er/URL');

    /**
     * 列表`Action`基类
     *
     * @class mvc.ListAction
     * @extends BaseAction
     */
    var exports = {};

    /**
     * 在搜索、翻页等操作后选择触发跳转还是仅刷新列表，设置为`false`会进
     * 入局部刷新的模式
     *
     * @protected
     * @member mvc.ListAction#redirectAfterChange
     * @type {boolean}
     */
    exports.redirectAfterChange = true;

    /**
     * 进行查询
     *
     * @protected
     * @method mvc.ListAction#performSearch
     * @param {Object} args 查询参数
     */
    exports.performSearch = function (args) {
        // 去除默认参数值
        var defaultArgs = this.model.getDefaultArgs();
        var extraArgs = this.model.getExtraQuery();
        args = u.chain(args)
            .extend(extraArgs)
            .purify(defaultArgs)
            .value();

        var event = this.fire('search', {args: args});
        if (!event.isDefaultPrevented()) {
            this.redirectForSearch(args);
        }
    };

    /**
     * 进行查询引起的重定向操作
     *
     * @protected
     * @method mvc.ListAction#redirectForSearch
     * @param {Object} args 查询参数
     */
    exports.redirectForSearch = function (args) {
        var path = this.model.get('url').getPath();
        var url = URL.withQuery(path, args);
        this.loadList(url);
    };

    /**
     * 获取指定页码的跳转URL
     *
     * @protected
     * @method mvc.ListAction#getURLForPage
     * @param {number} pageNo 指定的页码
     * @return {er/URL} 生成的分页URL对象
     */
    exports.getURLForPage = function (pageNo) {
        var url = this.model.get('url');
        var path = url.getPath();
        var query = url.getQuery();
        query.pageNo = pageNo;

        // 第一页省去页码参数
        if (pageNo === 1) {
            query = u.omit(query, 'pageNo');
        }

        return require('er/URL').withQuery(path, query);
    };

    /**
     * 查询的事件处理函数
     *
     * @event
     * @param {Object} e 事件对象
     * @ignore
     */
    function search(e) {
        this.performSearch(e.args);
    }

    /**
     * 前往指定页
     *
     * @event
     * @param {mini-event.Event} e 事件对象
     * @param {number} e.page 前往的页码
     * @ignore
     */
    function forwardToPage(e) {
        var event = this.fire('pagechange', {page: e.page});
        if (!event.isDefaultPrevented()) {
            var url = this.getURLForPage(e.page);
            this.loadList(url);
        }
    }

    /**
     * 根据新的URL参数刷新列表
     *
     * @protected
     * @method mvc.ListAction#loadList
     * @param {er.URL} [url] 新的URL对象，没有时按当前URL刷新
     * @fires listchange 跳转后将URL通过事件传递出来，作为child的时候父action可以去修改address bar
     * @return {er.Promise} 返回请求的Promise对象
     */
    exports.loadList = function (url) {
        if (this.redirectAfterChange) {
            this.redirect(url, {force: true});
        }
        else {
            var me = this;
            url = url || me.model.get('url');

            return me.model.loadData(url).then(function () {
                me.redirect(url, {silent: true});
                me.view.refresh();
                me.fire('listchange', {url: url});
            });
        }
    };

    /**
     * 初始化交互行为
     *
     * @override
     */
    exports.initBehavior = function () {
        this.$super(arguments);
        this.view.on('search', search, this);
        this.view.on('pagechange', forwardToPage, this);
    };

    /**
     * 初始化交互行为
     *
     * @override
     */
    exports.reload = function () {
        if (this.redirectAfterChange) {
            this.$super(arguments);
        }
        else {
            this.loadList();
        }
    };

    /**
     * 根据布局变化重新调整自身布局
     *
     * @protected
     * @method mvc.ListAction#adjustLayout
     */
    exports.adjustLayout = function () {
        this.view.adjustLayout();
    };

    /**
     * @override
     */
    exports.filterRedirect = function (url) {
        if (url.getPath() !== this.model.get('url').getPath()
            || this.redirectAfterChange) {
            return true;
        }
        this.loadList(url);
        return false;
    };

    var ListAction = require('eoo').create(BaseAction, exports);
    return ListAction;
});
