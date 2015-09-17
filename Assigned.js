Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    projectOid:23112780161,
    tagOid:21580021389,
    assignedDefects:[],
    numberOfAssignedDefectsBeforeTagged:0,
    launch: function() {
        this.getDefectsAssignedToTeam();
    },
    getDefectsAssignedToTeam:function(){
        Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['ObjectID','_ValidFrom','_ValidTo','FormattedID','Project','_PreviousValues.Project','Tags'],
            find: {'_TypeHierarchy':'Defect','_ProjectHierarchy':this.projectOid,'_PreviousValues.Project':this.projectOid,'_ValidFrom': {'$gte':'2015-08-01T06:00:00.000Z','$lte':'2015-09-01T05:59:59.000Z'}},
            hydrate: ['Project','_PreviousValues.Project'],
            listeners: {
                load: this.onSnapshotsLoaded, 
                scope: this
            }
            }).load({
                params : {
                    compress : true,
                    removeUnauthorizedSnapshots : true
                }
            });
    },
    onSnapshotsLoaded:function(store, records){
        //this.assignedDefects are defects that were moved out of Engineering to any of its child projects
        var defects = [];
        var idsOfDefectsAssignedBeforeTag = []; //to double check 
        _.each(records, function(record){
            if (record.data.Tags.length > 0) { 
                if(this.checkTagOid(record.data.Tags)){
                    defects.push(record.data);
                }
            }
            else{
                idsOfDefectsAssignedBeforeTag.push(record.data.ObjectID);
            }
        },this);
        
        _.each(defects, function(defect){
            this.assignedDefects.push({
                'ObjectID':defect.ObjectID,
                'FormattedID':defect.FormattedID,
                'AssignedOn':defect._ValidFrom,
                'AssignedTo':defect.Project.Name
            });
        },this);
        
        if (idsOfDefectsAssignedBeforeTag.length > 0) {
            this.numberOfAssignedDefectsBeforeTagged = idsOfDefectsAssignedBeforeTag.length;
            for(var i=this.numberOfAssignedDefectsBeforeTagged-1; i>=0;i--){
                this.doubleCheckTagOid(idsOfDefectsAssignedBeforeTag[i]);
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
            fetch: ['ObjectID','FormattedID','Project','Tags'],
            find: {'ObjectID':oid,'_TypeHierarchy':'Defect','_ProjectHierarchy':this.projectOid,'__At':'current'},
            hydrate: ['Project']
        }).load({
                callback: function(records, operation, success) {
                    if (records[0].data.Tags.length>0) {
                        if(this.checkTagOid(records[0].data.Tags)){
                            console.log('found cv tag', records[0].data.ObjectID, records[0].data.FormattedID); //this order is indeterminate. I saw 0, 2, 1, and 1, 2, 0
                            this.assignedDefects.push({
                                'ObjectID':records[0].data.ObjectID,
                                'FormattedID':records[0].data.FormattedID,
                                'AssignedOn':records[0].data._ValidFrom,
                                'AssignedTo':records[0].data.Project.Name
                            });
                        }
                        else{console.log('no cv tag');}
                    }
                    else{
                        console.log('no tags');
                    }
                    this.numberOfAssignedDefectsBeforeTagged--;
                    if (this.numberOfAssignedDefectsBeforeTagged === 0) {
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
        console.log(this.assignedDefects.length, 'CV tagged defects were moved to Engineering in August'); 
        this.add({
            xtype: 'rallygrid',
            showPagingToolbar: true,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: this.assignedDefects
            }),
            columnCfgs: [
                {text: 'ObjectID',dataIndex: 'ObjectID'},
                {text: 'FormattedID',dataIndex: 'FormattedID'},
                {text: 'Assigned On',dataIndex: 'AssignedOn'},
                {text: 'Assigned To',dataIndex: 'AssignedTo'}
            ],
            width: 500
        });
    }
});