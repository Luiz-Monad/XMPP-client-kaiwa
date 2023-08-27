
import BaseCollection from './baseCollection';
import Resource, { ResourceType } from './resource';

module.exports = BaseCollection.extend({
    type: 'resources',
    model: Resource,
    comparator: function (res1: ResourceType, res2: ResourceType) {
        var name1 = res1.mucDisplayName.toLowerCase(),
            name2 = res2.mucDisplayName.toLowerCase();
        return (name1 > name2) ? 1 : 
            (name1 < name2) ? -1 : 0;
    },
    search : function (letters?: string, removeMe?: boolean, addAll?: boolean) {
        if(letters == "" && !removeMe) return this;

        var collection = new module.exports(this.models);
        if (addAll)
            collection.add({id: this.parent.jid.bare + '/all'});

        var pattern = new RegExp('^' + letters + '.*$', "i");
        var filtered = collection.filter(function(data) {
            var nick = data.get("mucDisplayName");
            if (nick === me.nick) return false;
            return pattern.test(nick);
        });
        return new module.exports(filtered);
    },
});
