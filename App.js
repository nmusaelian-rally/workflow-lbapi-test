Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    projectOid:23112780161,
    tagOid:21580021389,
    assignedDefects:[],
    openedDefects:[],
    transitionedBeforeTagged:0,
    launch: function() {
        var gridPanel = Ext.create('Ext.Panel', {
            itemId:'gridPanel',
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            items: [{
                xtype: 'panel',
                title: 'CV defects assigned to teams in August',
                itemId:'childPanel1',
                flex: 1
            },{
                xtype: 'panel',
                title: 'CV defects opened in August',
                itemId:'childPanel2',
                flex: 1
            }]
        });
        this.add(gridPanel);
        this._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Please wait.This may take long depending on your data..."});
        this._myMask.show();
        this.getDefectsAssignedToTeam();
    },
    getDefectsAssignedToTeam:function(){
        this.transitionedBeforeTagged = 0;
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
        var defects = [];
        var idsOfDefectsAssignedBeforeTag = []; 
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
            this.transitionedBeforeTagged = idsOfDefectsAssignedBeforeTag.length;
            for(var i=this.transitionedBeforeTagged-1; i>=0;i--){
                this.doubleCheckTagOid(idsOfDefectsAssignedBeforeTag[i], 'Project');
            }
        }
    },
    getOpenedDefects:function(){
        this.transitionedBeforeTagged = 0;
        Ext.create('Rally.data.lookback.SnapshotStore', {
            find: {'_TypeHierarchy':'Defect','_ProjectHierarchy':this.projectOid,'State':'Open','_PreviousValues.State':'Submitted','_ValidFrom': {'$gte':'2015-08-01T06:00:00.000Z','$lte':'2015-09-01T05:59:59.000Z'}},
            fetch    : ['ObjectID','_ValidFrom','_ValidTo','FormattedID','State','Project','_PreviousValues.State','Tags'],
            hydrate: ['State','_PreviousValues.State','Project'],
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
        var idsOfDefectsOpenedBeforeTag = []; 
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
                'OpenedOn':defect._ValidFrom
            });
        },this);
        
        if (idsOfDefectsOpenedBeforeTag.length > 0) {
            this.transitionedBeforeTagged = idsOfDefectsOpenedBeforeTag.length;
            for(var i=this.transitionedBeforeTagged-1; i>=0;i--){
                this.doubleCheckTagOid(idsOfDefectsOpenedBeforeTag[i], 'State');
            }
        }
    },
    checkTagOid:function(tags){
        var isThere = _.some(tags, function(tag){
            return tag === this.tagOid;
        },this);
        return isThere;
    },
    doubleCheckTagOid:function(oid, attribute){
        Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch: ['ObjectID','FormattedID','Project','Tags'],
            find: {'ObjectID':oid,'_TypeHierarchy':'Defect','_ProjectHierarchy':this.projectOid,'__At':'current'},
            hydrate: ['Project']
        }).load({
                callback: function(records, operation, success) {
                    if (records[0].data.Tags.length>0) {
                        if(this.checkTagOid(records[0].data.Tags)){
                            console.log('found cv tag', records[0].data.ObjectID, records[0].data.FormattedID); //this order is indeterminate. I saw 0, 2, 1, and 1, 2, 0
                            if (attribute === 'Project') {
                                this.assignedDefects.push({
                                    'ObjectID':records[0].data.ObjectID,
                                    'FormattedID':records[0].data.FormattedID,
                                    'AssignedOn':records[0].data._ValidFrom,
                                    'AssignedTo':records[0].data.Project.Name
                                });
                            }
                            else if (attribute === 'State') {
                                this.openedDefects.push({
                                    'ObjectID':records[0].data.ObjectID,
                                    'FormattedID':records[0].data.FormattedID,
                                    'OpenedOn':records[0].data._ValidFrom
                                });
                            }
                            else{}
                            
                        }
                        else{console.log('no cv tag');}
                    }
                    else{
                        console.log('no tags');
                    }
                    
                    this.transitionedBeforeTagged--;
                    console.log('this.transitionedBeforeTagged',this.transitionedBeforeTagged);
                    if (this.transitionedBeforeTagged === 0) {
                        if (attribute === 'Project') {
                            this.makeGridOfAssignedDefects();
                        }
                        else if (attribute === 'State') {
                            this.makeGridOfOpenedDefects();
                        }
                        else{}
                    }
                },
                scope: this,
                params : {
                    compress : true,
                    removeUnauthorizedSnapshots : true
                }
        });
        
    },
    makeGridOfAssignedDefects:function(){
        this.assignedDefects = _.sortBy(this.assignedDefects, function(defect) {
            return [defect.ObjectID];
        });
        console.log(this.assignedDefects.length, 'CV tagged defects were moved to Engineering in August'); 
        this.down('#childPanel1').add({
            xtype: 'rallygrid',
            itemId: 'assignedDefectsGrid',
            showPagingToolbar: true,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: this.assignedDefects,
                sorter:[{
                    property: 'FormattedID',
                    direction: 'DESC'
                }]
            }),
            columnCfgs: [
                {text: 'ObjectID',dataIndex: 'ObjectID'},
                {text: 'FormattedID',dataIndex: 'FormattedID'},
                {text: 'Assigned To',dataIndex: 'AssignedTo',flex:1},
                {text: 'Assigned On',dataIndex: 'AssignedOn',flex:2}
            ],
            width: 500
        });
        this.getOpenedDefects();
    },
    makeGridOfOpenedDefects:function(){
        this.openedDefects = _.sortBy(this.openedDefects, function(defect) {
            return [defect.ObjectID];
        });
        this._myMask.hide();
        console.log(this.assignedDefects.length, 'CV tagged defects were moved to Engineering in August'); 
        this.down('#childPanel2').add({
            xtype: 'rallygrid',
            itemId: 'openedDefectsGrid',
            showPagingToolbar: true,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: this.openedDefects,
                sorter:[{
                    property: 'FormattedID',
                    direction: 'DESC'
                }]
            }),
            columnCfgs: [
                {text: 'ObjectID',dataIndex: 'ObjectID'},
                {text: 'FormattedID',dataIndex: 'FormattedID'},
                {text: 'State set to Open',dataIndex: 'OpenedOn', flex:1}
            ],
            width: 500
        });
    }
});