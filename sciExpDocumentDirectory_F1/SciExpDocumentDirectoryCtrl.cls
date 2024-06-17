public class SciExpDocumentDirectoryCtrl {
    //This below method is used to get the names of the Document Directories to display them in Tree Hierarchy
    @AuraEnabled(cacheable=true)
    public static List<DocumentTreeNode> getDocumentDirectoryHierarchy() {
        List<Documents_Directory__c> allRecords = [SELECT Id, Name, parent_folder__c,Folder_Details__c FROM Documents_Directory__c ORDER BY Name asc];
        system.debug(allrecords);
        Map<Id, DocumentTreeNode> nodeMap = new Map<Id, DocumentTreeNode>();
        List<DocumentTreeNode> roots = new List<DocumentTreeNode>();
        
        for (Documents_Directory__c record : allRecords) {
            //string FolderName = record.Folder_Details__c;
            //String plainText = FolderName.replaceAll('<.*?>', '');
            DocumentTreeNode node = new DocumentTreeNode(record.Id, record.Name);
            nodeMap.put(record.Id, node);
            if (record.parent_folder__c == null) {
                roots.add(node);
            }
        }
        
        for (Documents_Directory__c record : allRecords) {
            if (record.parent_folder__c != null) {
                DocumentTreeNode parentNode = nodeMap.get(record.parent_folder__c);
                if (parentNode != null) {
                    DocumentTreeNode childNode = nodeMap.get(record.Id);
                    if (childNode != null) {
                        parentNode.children.add(childNode);
                    }
                }
            }
        }
        
        return roots;
    }
    
    // This method is used to get the Related Files of the Selected Document Directory record.
    @AuraEnabled(cacheable=true)
    public static List<ContentVersion> getRelatedNotesAndAttachments(Id recordId) {
        List<ContentDocumentLink> links = [SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :recordId];
        set<id> CDLIds = new set<id>();
        for (ContentDocumentLink link : links) {
            CDLids.add(link.ContentDocumentId);
        }
        list<contentVersion> CVL = [SELECT Id,ContentDocumentId,ContentDocument.Title,ContentDocument.FileType,VersionDataUrl FROM contentVersion WHERE ContentDocumentId IN :CDLids];
        return CVL;
    }
    
    //This method is used for preview Videos when the user selects a video.
    @AuraEnabled(cacheable=true)
    public static map<id,string> getVideoContentVersions(Id contentDocumentId) {
        list<contentVersion> CVlist = [SELECT Id,ContentDocumentId,fileExtension,title, ContentUrl, FileType FROM ContentVersion WHERE Id = :contentDocumentId];
        map<id,string> CVmap = new map<id,string>();
        for(contentVersion cv : CVlist){
            CVmap.put(cv.ContentDocumentId,cv.id);
        }
        return CVmap;
    }
    
    // This Method is used to Search Files and Videos based on Title (or) Tags__c.
    @AuraEnabled(cacheable=true)
     public static List<ContentVersion> getSearchFiles(string searchTerm){
        List<ContentVersion> result = new List<ContentVersion>();
        string ddquery = 'select id,tags__c from Documents_Directory__c where tags__c includes(\'' +searchTerm+ '\')';
        List<Documents_Directory__c> records = Database.query(ddquery);
        system.debug(records.size());
        if(records.size() > 0 ){
        set<id> DDids = new set<id>();
        for(Documents_Directory__c DD : records){
            DDids.add(DD.id);
        }
        List<ContentDocumentLink> directoryLinks = [SELECT ContentDocumentId, LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntity.id in : DDids];
        Set<Id> contentDocumentIds = new Set<Id>();
        for(ContentDocumentLink link : directoryLinks) {
            contentDocumentIds.add(link.ContentDocumentId);
        }
        List<ContentVersion> files = [SELECT Id,ContentDocumentId, ContentDocument.Title, ContentDocument.FileType FROM ContentVersion WHERE ContentDocumentId IN :contentDocumentIds  AND ContentDocument.FileType != 'MP4'];
        List<ContentVersion> videos = [SELECT Id,ContentDocumentId, ContentDocument.Title, ContentDocument.FileType,VersionDataUrl FROM ContentVersion WHERE ContentDocumentId IN :contentDocumentIds AND ContentDocument.FileType = 'MP4'];
        result.addall(files);
        result.addall(videos);
        }
        else{
            set<id> DDids = new set<id>();
        list<Documents_Directory__c> DDList = [select id from Documents_Directory__c];
        for(Documents_Directory__c DD : DDList){
            DDids.add(DD.id);
        }
        List<ContentDocumentLink> directoryLinks = [SELECT ContentDocumentId, LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntity.id in : DDids];
        Set<Id> contentDocumentIds = new Set<Id>();
        for(ContentDocumentLink link : directoryLinks) {
            contentDocumentIds.add(link.ContentDocumentId);
        }
        List<ContentVersion> files = [SELECT Id, ContentDocumentId, ContentDocument.Title, ContentDocument.FileType FROM ContentVersion WHERE ContentDocumentId IN :contentDocumentIds AND ContentDocument.Title LIKE :'%'+searchTerm+'%' AND ContentDocument.FileType != 'MP4'];
        List<ContentVersion> videos = [SELECT Id, ContentDocumentId, ContentDocument.Title, ContentDocument.FileType,VersionDataUrl FROM ContentVersion WHERE ContentDocumentId IN :contentDocumentIds AND ContentDocument.Title LIKE :'%'+searchTerm+'%' AND ContentDocument.FileType = 'MP4'];
        system.debug('searched files size ==> '+files.size());
            result.addall(files);
        result.addall(videos);
        }
        return result;
    }
    
    @AuraEnabled(cacheable=true)
    public static list<contentVersion> getThumbnails(list<contentVersion> CDL){
        list<contentVersion> CVlist = [select id,ContentDocumentId,ContentDocument.Title,ContentDocument.FileType,VersionDataUrl from contentVersion where id in : CDL];
        system.debug('CVlist size ===> '+ CVlist.size());
        return CVlist;
    }

    @AuraEnabled
    public static List<ContentVersion> getDocumentDirectoriesList(Map<String,String> options){
        Map<Id,ContentVersion> contentVersionSOQLMap = new Map<Id,ContentVersion>();
        
        Set<Id> contentDocumentIdsSet = new Set<Id>();
        String documentDirectoriesSOQL = 'SELECT Id FROM Documents_Directory__c';
        if(options!=null && !options.isEmpty()){
            documentDirectoriesSOQL+='WHERE ';
            for(String optionKey: options.keySet()){
                documentDirectoriesSOQL+= optionKey+'='+options.get(optionKey)+' AND ';
            }
            documentDirectoriesSOQL.removeEndIgnoreCase(' AND ');
        }
        Map<Id,Documents_Directory__c> documentDirectoriesSOQLMap = new Map<Id,Documents_Directory__c>((List<Documents_Directory__c>) Database.query(documentDirectoriesSOQL));
        if(!documentDirectoriesSOQLMap.isEmpty()){
            List<ContentDocumentLink> contentDocumentLinkSOQLList = [SELECT ContentDocumentId, LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntity.id in : documentDirectoriesSOQLMap.keySet()];
            if(!contentDocumentLinkSOQLList.isEmpty()){
                for(ContentDocumentLink cdl: contentDocumentLinkSOQLList){
                    contentDocumentIdsSet.add(cdl.ContentDocumentId);
                }
            }
        }
        if(!contentDocumentIdsSet.isEmpty()){
            contentVersionSOQLMap = new Map<Id,ContentVersion>([
                SELECT Id,
                Title,
                ContentDocumentId,
                FileType, 
                ContentSize,
                FileExtension,
                VersionNumber,
                CreatedDate,
                VersionData,
                VersionDataUrl,
                FirstPublishLocationId,
                LastModifiedDate
                FROM ContentVersion
                WHERE ContentDocumentId IN :contentDocumentIdsSet AND IsLatest=true
                ]);
        }
        return contentVersionSOQLMap.values();
    }
    
    public class DocumentTreeNode {
        @AuraEnabled
        public Id id;
        @AuraEnabled
        public String name;
        @AuraEnabled
        public List<DocumentTreeNode> children = new List<DocumentTreeNode>();
        
        public DocumentTreeNode(Id id, String name) {
            this.id = id;
            this.name = name;
        }
    }

}