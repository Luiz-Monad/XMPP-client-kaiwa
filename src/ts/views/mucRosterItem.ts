
import _ from 'underscore';

import templates from 'templates';
import { ResourceType } from '../models/resource';
import HumanView from '../helpers/human-view';

export default HumanView.extend<ResourceType>().extend({
    template: templates.includes.mucRosterItem,
    events: {
        'click': 'handleClick',
    },
    classBindings: {
        show: '',
        chatState: '',
        idle: '',
    },
    textBindings: {
        mucDisplayName: '.name',
    },
    render: function () {
        this.renderAndBind({ contact: this.model });
        return this;
    },
    handleClick: function (e: JQuery.ClickEvent) {
        this.parent?.trigger('rosterItemClicked', this.model.mucDisplayName);
    },
});
