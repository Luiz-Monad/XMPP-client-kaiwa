//   (c) 2013 Henrik Joreteg
//   MIT Licensed
//   For all details and documentation:
//   https://github.com/HenrikJoreteg/human-view
//

/// <reference path="../types/human-view.d.ts" />

import Backbone from 'backbone';
import _ from 'underscore';

import { HumanViewConstructor, HumanViewOptions } from '../types/human-view';

const HumanView: HumanViewConstructor = Backbone.View.extend({
    // ## registerSubview
    // Pass it a view. This can be anything with a `remove` method
    registerSubview: function (view: Backbone.View) {
        // Storage for our subviews.
        this._subviews || (this._subviews = []);
        this._subviews.push(view);
        // If view has an 'el' it's a single view not
        // an array of views registered by renderCollection
        // so we store a reference to the parent view.
        if (view.el && 'parent' in view) view.parent = this;
        return view;
    },

    // ## renderSubview
    // Pass it a view instance and a container element
    // to render it in. It's `remove` method will be called
    // when theh parent view is destroyed.
    renderSubview: function (view: Backbone.View, container: string | HTMLElement | JQuery<HTMLElement>) {
        let ct: HTMLElement;
        if (typeof container === 'string') {
            ct = $(container)[0];
        } else {
            // de-jquerify
            ct = (container as any)[0] || container;
        }
        this.registerSubview(view);
        view.render();
        ct.appendChild(view.el);
        return view;
    },

    // ## registerBindings
    // This makes it simple to bind model attributes to the DOM.
    // To use it, add a declarative bindings to your view like this:
    //
    //   const ProfileView = HumanView.extend({
    //     template: 'profile',
    //     textBindings: {
    //       'name': '.name'
    //     },
    //     classBindings: {
    //       'active': ''
    //     },
    //     render: function () {
    //       this.renderAndBind();
    //       return this;
    //     }
    //   });
    registerBindings: function (specificModel: Backbone.Model, bindings: HumanViewOptions) {
        const self = this;
        const types = {
            textBindings: 'text',
            htmlBindings: 'html',
            srcBindings: 'src',
            hrefBindings: 'href',
            attributeBindings: '',
            inputBindings: 'val'
        };
        const model = specificModel || this.model;
        const bindingObject: Record<string, any> = bindings || this;

        if (!model) throw new Error('Cannot register bindings without a model');
        _.each(types, function (methodName, bindingType) {
            _.each(bindingObject[bindingType], function (selector, key) {
                let func;
                const attrName = function () {
                    if (bindingType === 'attributeBindings') {
                        const res = selector[1];
                        selector = selector[0];
                        return res;
                    } else if (methodName === 'href' || methodName === 'src') {
                        return methodName;
                    }
                }();
                func = function () {
                    const el = self.getMatches(self.el, selector);

                    if (attrName) {
                        el.attr(attrName, model.get(key));
                    } else {
                        el[methodName](model.get(key));
                    }
                };
                self.listenTo(model, 'change:' + key, func);
                func();
            });
        });

        // Class bindings are a bit special. We have to
        // remove previous, etc.
        _.each(bindingObject.classBindings, function (selector, key) {
            const func = function () {
                const newVal = model.get(key);
                const prevVal = model.previous(key);
                const el = self.getMatches(self.el, selector);

                if (_.isBoolean(newVal)) {
                    if (newVal) {
                        el.addClass(key);
                    } else {
                        el.removeClass(key);
                    }
                } else {
                    if (prevVal) el.removeClass(prevVal);
                    el.addClass(newVal);
                }
            };
            self.listenTo(model, 'change:' + key, func);
            func();
        });

        return this;
    },

    // ## renderAndBind
    // Commbo for renderWithTemplate and registering bindings
    renderAndBind: function (context: any, templateArg: string | Function) {
        this.renderWithTemplate(context, templateArg);
        if (this.model) this.registerBindings();
        return this;
    },

    // ## getByRole
    // Gets an element within a view by its role attribute.
    // Also works for the root `el` if it has the right role.
    getByRole: function (role: string) {
        return this.$('[role="' + role + '"]')[0] ||
            ((this.el.getAttribute('role') === role && this.el) || undefined);
    },

    // ## getMatches
    // Gets matching element from the view by selector
    getMatches: function (el: HTMLElement, selector: string) {
        const $el = $(el);

        if (selector === '') return $el;
        if ($el.is(selector)) return $el;
        return $(Array.prototype.slice.call(el.querySelectorAll(selector)));
    },

    // Shortcut for doing everything we need to do to
    // render and fully replace current root element.
    // Either define a `template` property of your view
    // or pass in a template directly.
    // The template can either be a string or a function.
    // If it's a function it will be passed the `context`
    // argument.
    renderWithTemplate: function (context: any, templateArg: string | Function) {
        const template = templateArg || this.template;
        if (!template) throw new Error('Template string or function needed.');
        const html = _.isString(template) ? template : template(context || {});
        const wrappedEl = $(html);
        const newEl = wrappedEl[0];

        // this is needed because jQuery and others
        // do weird things if you try to replace the body.
        // Also doing $(newEl)[0] will give you first child if
        // it's a <body> element for some reason.
        if (this.el === document.body) {
            document.body.innerHTML = html;
            this.delegateEvents();
        } else {
            // safeguard check to help developers debug situation where
            // they have more than one root element in the template.
            if (wrappedEl[1]) throw new Error('Views can only have one root element.');

            $(this.el).replaceWith(newEl);
            // We don't call delegate events if rendered by parent
            // this solves a stupid bug in jQuery where you can't
            // attach event handlers to a detached element
            // ref: http://api.jquery.com/on/#direct-and-delegated-events
            this.setElement(newEl, !this.renderedByParentView);
        }
    },

    // ## addReferences
    // This is a shortcut for adding reference to specific elements within your view for
    // access later. This is avoids excessive DOM queries and gives makes it easier to update
    // your view if your template changes. You could argue whether this is worth doing or not,
    // but I like it.
    // In your `render` method. Use it like so:
    //
    //     render: function () {
    //       this.basicRender();
    //       this.addReferences({
    //         pages: '#pages',
    //         chat: '#teamChat',
    //         nav: 'nav#views ul',
    //         me: '#me',
    //         cheatSheet: '#cheatSheet',
    //         omniBox: '#awesomeSauce'
    //       });
    //     }
    //
    // Then later you can access elements by reference like so: `this.$pages`, or `this.$chat`.
    addReferences: function (hash: Record<string, string>) {
        for (const item in hash) {
            this['$' + item] = $(hash[item], this.el);
        }
    },

    // ## listenToAndRun
    // Shortcut for registering a listener for a model
    // and also triggering it right away.
    listenToAndRun: function (object: any, events: string, handler: Function) {
        const bound = _.bind(handler, this);
        this.listenTo(object, events, bound);
        bound();
    },

    // ## animateRemove
    // Placeholder for if you want to do something special when they're removed.
    // For example fade it out, etc.
    // Any override here should call `.remove()` when done.
    animateRemove: function () {
        this.remove();
    },

    // ## renderCollection
    // Method for rendering a collections with individual views.
    // Just pass it the collection, and the view to use for the items in the
    // collection.
    renderCollection: function (collection: Backbone.Collection, ViewClass: typeof Backbone.View, container: HTMLElement | JQuery<HTMLElement>, opts: any) {
        const self = this;
        const views: any[] = [];
        const options = _.defaults(opts || {}, {
            filter: null,
            viewOptions: {},
            reverse: false
        });
        const containerEl = $(container);

        // store a reference on the view to it's collection views
        // so we can clean up memory references when we're done
        this.registerSubview(views);

        function getViewBy(model: any) {
            return _.find(views, function (view) {
                return model === view.model;
            });
        }

        function addView(model: any, collection: any, opts: any) {
            const matches = options.filter ? options.filter(model) : true;
            let view: any;
            if (matches) {
                view = getViewBy(model);
                if (!view) {
                    view = new ViewClass(_({ model: model, collection: collection }).extend(options.viewOptions));
                    views.push(view);
                    view.parent = self;
                    view.renderedByParentView = true;
                    view.render({ containerEl: container });
                }
                // give the option for the view to choose where it's inserted if you so choose
                if (!view.insertSelf) containerEl[options.reverse ? 'prepend' : 'append'](view.el);
                view.delegateEvents();
            }
        }
        function reRender() {
            // Empty without using jQuery's empty (which removes jQuery handlers)
            // Originally we did: containerEl[0].innerHTML = '';
            // but that fails in IE10 because of a browser bug.
            const parent = containerEl[0];
            const childNodes = Array.prototype.slice.call(parent.childNodes);
            _.each(childNodes, function (child) {
                parent.removeChild(child);
            });
            collection.each(addView);
        }
        this.listenTo(collection, 'add', addView);
        this.listenTo(collection, 'remove', function (model: any) {
            const index = views.indexOf(getViewBy(model));
            if (index !== -1) {
                // remove it if we found it calling animateRemove
                // to give user option of gracefully destroying.
                views.splice(index, 1)[0].animateRemove();
            }
        });
        this.listenTo(collection, 'move sort', reRender);
        this.listenTo(collection, 'refresh reset', function () {
            // empty array calling `remove` on each
            // without re-defining `views`
            while (views.length) {
                views.pop().remove();
            }
            reRender();
        });
        reRender();
    },

    // ## remove
    // Overwrites Backbone's `remove` to also unbinds handlers
    // for models in any views rendered by `renderCollection`.
    remove: function () {
        _.chain(this._subviews).flatten().invoke('remove');
        // call super
        return Backbone.View.prototype.remove.call(this);
    }
});

export default HumanView;
