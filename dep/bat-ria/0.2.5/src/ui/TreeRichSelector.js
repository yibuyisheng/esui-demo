/**
 * ADM 2.0
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file 树形选择控件
 * @author lixiang(lixiang05@baidu.com)
 */

define(
    function (require) {
        require('esui/Tree');
        var painter = require('esui/painters');
        var ui = require('esui/main');
        var lib = require('esui/lib');
        var u = require('underscore');
        var RichSelector = require('./RichSelector');
        var TreeStrategy = require('./SelectorTreeStrategy');

        /**
         * 控件类
         *
         * @constructor
         * @param {Object} options 初始化参数
         */
        function TreeRichSelector(options) {
            RichSelector.apply(this, arguments);
        }

        lib.inherits(TreeRichSelector, RichSelector);

        TreeRichSelector.prototype.type = 'TreeRichSelector';
        TreeRichSelector.prototype.styleType = 'RichSelector';

        TreeRichSelector.prototype.initOptions = function (options) {
            var properties = {
                // 数据源
                datasource: null,
                // 树的相关属性
                orientExpand: false,
                wideToggleArea: false,
                onlyLeafSelect: true,
                allowUnselectNode: false,
                hideRoot: true,
                treeSkin: 'flat'
            };

            lib.extend(properties, options);
            RichSelector.prototype.initOptions.call(this, properties);
        };

        TreeRichSelector.prototype.initStructure = function () {
            RichSelector.prototype.initStructure.apply(this, arguments);
            lib.addClass(
                this.main,
                'ui-tree-richselector'
            );
        };

        /**
         * 重新渲染视图
         * 仅当生命周期处于RENDER时，该方法才重新渲染
         *
         * @param {Array=} 变更过的属性的集合
         * @override
         */
        TreeRichSelector.prototype.repaint = painter.createRepaint(
            RichSelector.prototype.repaint,
            {
                name: 'datasource',
                paint: function (control, datasource) {
                    control.refresh();
                }
            },
            {
                name: 'selectedData',
                paint:
                    function (control, selectedData) {
                        // 先取消选择
                        var allData = control.allData;
                        if (allData && allData.children) {
                            control.selectItems(allData.children, false);
                            control.selectItems(selectedData, true);
                            control.fire('add');
                        }
                    }
            }
        );

        /**
         * 适配数据，创建一个全集扁平索引
         *
         * @param {ui.TreeRichSelector} treeForSelector 类实例
         * @ignore
         */
        TreeRichSelector.prototype.adaptData = function () {
            // 这是一个不具备任何状态的东西
            this.allData = this.datasource;
            // 一个扁平化的索引
            // 其中包含父节点信息，以及节点选择状态
            var indexData = {};
            if (this.allData && this.allData.children) {
                indexData[this.allData.id] = {
                    parentId: null,
                    node: this.allData,
                    isSelected: false
                };
                walkTree(
                    this.allData,
                    this.allData.children,
                    function (parent, child) {
                        indexData[child.id] = {
                            parentId: parent.id,
                            node: child,
                            isSelected: false
                        };
                    }
                );
            }
            this.indexData = indexData;
        };

        /**
         * 刷新备选区
         * @override
         */
        TreeRichSelector.prototype.refreshContent = function () {
            var treeData = this.isQuery() ? this.queriedData : this.allData;
            if (!treeData
                || !treeData.children
                || !treeData.children.length) {
                this.addState('empty');
            }
            else {
                this.removeState('empty');
            }

            if (!treeData || !treeData.children) {
                return;
            }

            var queryList = this.getQueryList();
            var tree = queryList.getChild('tree');
            if (!tree) {
                var options = {
                    childName: 'tree',
                    datasource: treeData,
                    allowUnselectNode: this.allowUnselectNode,
                    strategy:
                        new TreeStrategy(
                            {
                                mode: this.mode,
                                onlyLeafSelect: this.onlyLeafSelect,
                                orientExpand: this.orientExpand
                            }
                        ),
                    wideToggleArea: this.wideToggleArea,
                    hideRoot: this.hideRoot,
                    selectMode: this.multi ? 'multiple' : 'single',
                    skin: this.treeSkin
                };
                if (this.getItemHTML) {
                    options.getItemHTML = this.getItemHTML;
                }
                tree = ui.create('Tree', options);
                queryList.addChild(tree);
                tree.appendTo(queryList.main);

                var me = this;
                var indexData = this.indexData;
                tree.on(
                    'selectnode',
                    function (e) {
                        var node = e.node;
                        me.handlerAfterClickNode(node);
                    }
                );

                tree.on(
                    'unselectnode',
                    function (e) {
                        var node = e.node;
                        if (indexData[node.id]) {
                            indexData[node.id].isSelected = false;
                        }
                    }
                );
            }
            else {
                tree.setProperties({
                    datasource: u.deepClone(treeData),
                    keyword: this.getKeyword()
                });
            }

        };

        /**
         * 点击触发，选择或删除节点
         * @param {Object} node 节点对象
         * @ignore
         */
        TreeRichSelector.prototype.handlerAfterClickNode = function (node) {
            // 这个item不一定是源数据元，为了连锁同步，再取一遍
            var item = this.indexData[node.id];
            if (!item) {
                return;
            }

            if (this.mode === 'add') {
                actionForAdd(this, item);
            }
            else if (this.mode === 'delete') {
                actionForDelete(this, item);
            }
            else if (this.mode === 'load') {
                actionForLoad(this, item);
            }
        };

       /**
         * 添加动作
         *
         * @param {ui.TreeRichSelector} control 类实例
         * @param {Object} item 保存在indexData中的item
         *
         * @ignore
         */
        function actionForAdd(control, item) {
            item.isSelected = true;
            // 如果是单选，需要将其他的已选项置为未选
            if (!control.multi) {
                // 赋予新值
                control.curSeleId = item.node.id;
            }
            control.fire('add');
        }

       /**
         * 选择或取消选择
         *   如果控件是单选的，则将自己置灰且将其他节点恢复可选
         *   如果控件是多选的，则仅将自己置灰
         *
         * @param {ui.TreeRichSelector} control 类实例
         * @param {Object} id 结点对象id
         * @param {boolean} toBeSelected 置为选择还是取消选择
         *
         * @ignore
         */
        function selectItem(control, id, toBeSelected) {
            var tree = control.getQueryList().getChild('tree');
            // 完整数据
            var indexData = control.indexData;
            var item = indexData[id];

            if (!item) {
                return;
            }

            // 如果是单选，需要将其他的已选项置为未选
            if (!control.multi && toBeSelected) {
                unselectCurrent(control);
                // 赋予新值
                control.curSeleId = id;
            }

            item.isSelected = toBeSelected;
            if (toBeSelected) {
                tree.selectNode(id, true);
            }
            else {
                tree.unselectNode(id, true);
            }
        }

        /**
         * 撤销选择当前项
         * @param {ui.TreeRichSelector} control 类实例
         * @ignore
         */
        function unselectCurrent(control) {
            var curId = control.curSeleId;
            // 撤销当前选中项
            if (curId) {
                var treeList = control.getQueryList().getChild('tree');
                treeList.unselectNode(curId);
                control.curSeleId = null;
            }
        }

        /**
         * 添加全部
         *
         * @override
         */
        TreeRichSelector.prototype.selectAll = function () {
            var data = this.isQuery() ? this.queriedData : this.allData;
            var children = data.children;
            var items = this.getLeafItems(children, false);
            var me = this;
            u.each(items, function (item) {
                selectItem(me, item.id, true);
            });
            this.fire('add');
        };

        /**
         * 批量选择或取消选择，供外部调用，不提供fire事件
         *
         * @param {Array} nodes 要改变状态的节点集合
         * @param {boolean} toBeSelected 目标状态 true是选择，false是取消
         * @override
         */
        TreeRichSelector.prototype.selectItems = function (nodes, toBeSelected) {
            var indexData = this.indexData;
            var me = this;
            u.each(
                nodes,
                function (node) {
                    var id = node.id !== undefined ? node.id : node;
                    var item = indexData[id];
                    if (item !== null && item !== undefined) {
                        // 更新状态，但不触发事件
                        selectItem(me, item.node.id, toBeSelected);
                    }
                }
            );
        };

        /**
         * 删除动作
         *
         * @param {ui.TreeRichSelector} control 类实例
         * @param {Object} item 保存在indexData中的item
         *
         * @ignore
         */
        function actionForDelete(control, item) {
            deleteItem(control, item.node.id);
            // 外部需要知道什么数据被删除了
            control.fire('delete', {items: [item.node]});
        }

        /**
         * 删除选择的节点
         *
         * @param {ui.TreeRichSelector} control 类实例
         * @param {number} id 结点数据id
         *
         * @ignore
         */
        function deleteItem(control, id) {
            // 完整数据
            var indexData = control.indexData;
            var item = indexData[id];

            var parentId = item.parentId;
            var parentItem = indexData[parentId];
            var node;
            if (!parentItem) {
                node = control.allData;
            }
            else {
                node = parentItem.node;
            }

            var children = node.children || [];

            // 从parentNode的children里删除
            var newChildren = u.without(children, item.node);
            // 没有孩子了，父节点也删了吧
            if (newChildren.length === 0 && parentId !== -1) {
                deleteItem(control, parentId);
            }
            else {
                node.children = newChildren;
                // datasource以引用形式分布下来，因此无需重新set了
                control.refresh();
            }
        }


        /**
         * 删除全部
         *
         * @FIXME 删除全部要区分搜索和非搜索状态么
         * @override
         */
        TreeRichSelector.prototype.deleteAll = function () {
            var items = u.deepClone(this.getSelectedItems());
            this.set('datasource', null);
            this.fire('delete', {items: items});
        };

        /**
         * 加载动作
         *
         * @param {ui.TreeRichSelector} control 类实例
         * @param {Object} item 保存在indexData中的item
         *
         * @ignore
         */
        function actionForLoad(control, item) {
            selectItem(control, item.id, true);
            control.fire('load');
        }

        /**
         * 获取指定状态的叶子节点，递归
         *
         * @param {Array=} data 检测的数据源
         * @param {boolean} isSelected 选择状态还是未选状态
         * @return {Array} 叶子节点数组
         * @ignore
         */
        TreeRichSelector.prototype.getLeafItems = function (data, isSelected) {
            var leafItems = [];
            var me = this;
            var indexData = this.indexData;
            u.each(data, function (item) {
                if (isLeaf(item)) {
                    var indexItem = indexData[item.id];
                    var valid = (isSelected === indexItem.isSelected);
                    if (me.mode === 'delete' || valid) {
                        leafItems.push(item);
                    }
                }
                else {
                    leafItems = u.union(
                        leafItems,
                        me.getLeafItems(item.children, isSelected)
                    );
                }
            });

            return leafItems;
        };

        /**
         * 或许当前已选择的数据
         *
         * @return {Object}
         * @public
         */
        TreeRichSelector.prototype.getSelectedItems = function () {
            var data = this.allData.children;
            return this.getLeafItems(data, true);
        };


        /**
         * 或许当前已选择的数据
         *
         * @return {Object}
         * @public
         */
        TreeRichSelector.prototype.getSelectedTree = function () {
            var me = this;
            var copyData = u.deepClone(this.allData);
            var nodes = copyData.children;
            u.each(nodes, function (node) {
                var selectedChildren = getSelectedNodesUnder(node, me);
                if (selectedChildren.length) {
                    node.children = selectedChildren;
                }
                else {
                    node.children = null;
                }
            });
            var filteredNodes = u.filter(nodes, function (node) {
                return node.children;
            });
            copyData.children = filteredNodes;
            return copyData;
        };

        function getSelectedNodesUnder(parentNode, control) {
            var children = parentNode.children;
            var indexData = control.indexData;
            return u.filter(children, function (node) {
                var indexItem = indexData[node.id];
                return indexItem.isSelected;
            });

        }

        /**
         * 清除搜索结果
         * @param {ui.RichSelector2} richSelector 类实例
         * @return {false} 阻止默认行为
         * @ignore
         */
        TreeRichSelector.prototype.clearQuery = function () {
            RichSelector.prototype.clearQuery.apply(this, arguments);
            this.selectItems(this.selectedData, true);

            return false;
        };

        /**
         * 清空搜索的结果
         *
         */
        TreeRichSelector.prototype.clearData = function () {
            // 清空数据
            this.queriedData = {};
        };

        /**
         * 搜索含有关键字的结果
         *
         * @param {string} keyword 关键字
         */
        TreeRichSelector.prototype.queryItem = function (keyword) {
            var filteredTreeData = [];
            filteredTreeData = queryFromNode(keyword, this.allData);
            // 更新状态
            this.queriedData = {
                id: '-1', text: '符合条件的结果', children: filteredTreeData
            };
            this.addState('queried');
            this.refreshContent();
            this.selectItems(this.selectedData, true);
        };

        /**
         * 供递归调用的搜索方法
         *
         * @param {string} keyword 关键字
         * @param {Object} node 节点对象
         * @return {Array} 结果集
         */
        function queryFromNode(keyword, node) {
            var filteredTreeData = [];
            var treeData = node.children;
            u.each(
                treeData,
                function (data, key) {
                    var filteredData;
                    // 命中，先保存副本
                    if (data.text.indexOf(keyword) !== -1) {
                        filteredData = u.clone(data);
                    }
                    // 如果子节点也有符合条件的，那么只把符合条件的子结点放进去
                    if (data.children && data.children.length) {
                        var filteredChildren = queryFromNode(keyword, data);
                        if (filteredChildren.length > 0) {
                            if (!filteredData) {
                                filteredData = u.clone(data);
                            }
                            filteredData.children = filteredChildren;
                        }
                    }

                    if (filteredData) {
                        filteredTreeData.push(filteredData);
                    }
                }
            );
            return filteredTreeData;
        }

        /**
         * 一个遍历树的方法
         *
         * @param {Object} parent 父节点
         * @param {Array} children 需要遍历的树的孩子节点
         * @param {Function} callback 遍历时执行的函数
         * @ignore
         */
        function walkTree(parent, children, callback) {
            u.each(
                children,
                function (child, key) {
                    callback(parent, child);
                    walkTree(child, child.children, callback);
                }
            );
        }

        function isLeaf(node) {
            return !node.children;
        }

        function getLeavesCount(node) {
            // 是叶子节点，但不是root节点
            if (isLeaf(node)) {
                // FIXME: 这里感觉不应该hardcode，后期想想办法
                if (!node.id || node.id === '-1' || node.id === '0') {
                    return 0;
                }
                return 1;
            }
            var count = u.reduce(
                node.children,
                function (sum, child) {
                    return sum + getLeavesCount(child);
                },
                0
            );
            return count;
        }

        /**
         * 获取当前列表的结果个数
         *
         * @return {number}
         * @public
         */
        TreeRichSelector.prototype.getFilteredItemsCount = function () {
            var node = this.isQuery() ? this.queriedData : this.allData;
            var count = getLeavesCount(node);
            return count;
        };


        /**
         * 获取当前状态的显示个数
         *
         * @return {number}
         * @override
         */
        TreeRichSelector.prototype.getCurrentStateItemsCount = function () {
            var node = this.isQuery() ? this.queriedData : this.allData;
            if (!node) {
                return 0;
            }
            var count = getLeavesCount(node);
            return count;
        };


        require('esui').register(TreeRichSelector);
        return TreeRichSelector;
    }
);
