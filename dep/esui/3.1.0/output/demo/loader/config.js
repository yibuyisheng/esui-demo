require.config({
        'baseUrl': '../../../asset',
        'paths': { 'css': '../demo/loader/css' },
        'packages': [
            {
                'name': 'esui',
                'location': '../asset',
                'main': 'main'
            },
            {
                'name': 'mini-event',
                'location': '../dep/mini-event/1.0.2/asset',
                'main': 'main'
            },
            {
                'name': 'underscore',
                'location': '../dep/underscore/1.5.2/asset',
                'main': 'underscore'
            },
            {
                'name': 'moment',
                'location': '../dep/moment/2.7.0/asset',
                'main': 'moment'
            },
            {
                'name': 'etpl',
                'location': '../dep/etpl/3.0.0/asset',
                'main': 'main'
            }
        ]
    });
document.createElement('header');
var prefix = 'esui-';
var elements = [
    'Calendar', 'Crumb', 'Dialog', 'Label', 'Month-View', 'Pager', 'Panel', 'Range-Calendar',
    'Region', 'Rich-Calendar', 'Schedule', 'Search-Box', 'Sidebar', 'Select', 'Tab', 'Table',
    'Text-Box', 'Text-Line', 'Tip', 'Tip-Layer', 'Tree', 'Wizard'
];

for (var i = elements.length - 1; i > -1; --i) {
    document.createElement(prefix + elements[i]);
}