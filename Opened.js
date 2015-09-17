
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    projectOid:23112780161,
    tagOid:21580021389,
    openedDefects:[],
    numberOfDefectsOpenedBeforeTagged:0,
    launch: function() {
        this.getOpenedDefects();
    },
    getOpenedDefects:function(){
        Ext.create('Rally.data.lookback.SnapshotStore', {
            find: {'_TypeHierarchy':'Defect','_ProjectHierarchy':this.projectOid,'State':'Open','_PreviousValues.State':'Submitted','_ValidFrom': {'$gte':'2015-08-01T06:00:00.000Z','$lte':'2015-09-01T05:59:59.000Z'}},
            fetch    : ['ObjectID','_ValidFrom','_ValidTo','FormattedID','Project','State','_PreviousValues.State','Tags'],
            hydrate: ['State','_PreviousValues.State'],
            listeners: {
                load: this.onOpenedSnapshotsLoaded, 
                scope: this
            }
            }).load({
                params : {
                    compress : true,
                    removeUnauthorizedSnapshots : true
                }
            });
    },
    onOpenedSnapshotsLoaded:function(store, records){
        var defects = [];
        var idsOfDefectsOpenedBeforeTag = []; //to double check 
        _.each(records, function(record){
            if (record.data.Tags.length > 0) { 
                if(this.checkTagOid(record.data.Tags)){
                    defects.push(record.data);
                }
            }
            else{
                idsOfDefectsOpenedBeforeTag.push(record.data.ObjectID);
            }
        },this);
        
        _.each(defects, function(defect){
            this.openedDefects.push({
                'ObjectID':defect.ObjectID,
                'FormattedID':defect.FormattedID,
                'OpenedOn':defect._ValidFrom,
                'State':defect.State
            });
        },this);
        
        if (idsOfDefectsOpenedBeforeTag.length > 0) {
            this.numberOfDefectsOpenedBeforeTagged = idsOfDefectsOpenedBeforeTag.length;
            for(var i=this.numberOfDefectsOpenedBeforeTagged-1; i>=0;i--){
                this.doubleCheckTagOid(idsOfDefectsOpenedBeforeTag[i]);
            }
        }
    },
    checkTagOid:function(tags){
        var isThere = _.some(tags, function(tag){
            return tag === this.tagOid;
        },this);
        return isThere;
    },
    doubleCheckTagOid:function(oid){
        Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch: ['ObjectID','FormattedID','State','Project','Tags'],
            find: {'ObjectID':oid,'_TypeHierarchy':'Defect','_ProjectHierarchy':this.projectOid,'__At':'current'},
            hydrate: ['Project','State']
        }).load({
                callback: function(records, operation, success) {
                    if (records[0].data.Tags.length>0) {
                        if(this.checkTagOid(records[0].data.Tags)){
                            console.log('found cv tag', records[0].data.ObjectID, records[0].data.FormattedID); //this order is indeterminate. I saw 0, 2, 1, and 1, 2, 0
                            this.openedDefects.push({
                                'ObjectID':records[0].data.ObjectID,
                                'FormattedID':records[0].data.FormattedID,
                                'OpenedOn':records[0].data._ValidFrom,
                                'State':records[0].data.State
                            });
                        }
                        else{
                            console.log('no cv tag');
                        }
                    }
                    else{
                        console.log('no tags');
                    }
                    this.numberOfDefectsOpenedBeforeTagged--;
                    if (this.numberOfDefectsOpenedBeforeTagged === 0) {
                        this.makeGrid();
                    }
                },
                scope: this,
                params : {
                    compress : true,
                    removeUnauthorizedSnapshots : true
                }
        });
        
    },
    makeGrid:function(){
        console.log(this.openedDefects.length, 'CV tagged defect transitioned to Open from Submitted'); 
        this.add({
            xtype: 'rallygrid',
            showPagingToolbar: true,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: this.openedDefects
            }),
            columnCfgs: [
                {text: 'ObjectID',dataIndex: 'ObjectID'},
                {text: 'FormattedID',dataIndex: 'FormattedID'},
                {text: 'Opened On',dataIndex: 'OpenedOn'},
                {text: 'State',dataIndex: 'State'}
            ],
            width: 500
        });
    }
});