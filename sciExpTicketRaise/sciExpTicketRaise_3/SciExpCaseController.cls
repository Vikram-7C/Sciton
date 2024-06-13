/*
* Description: The controller for handling Cases in Community portal
*/ 
public class SciExpCaseController {
    
    //Method Description :- This method is used to get the Logged-In user Cases
    @AuraEnabled(cacheable=true)
    public static List<Case> fetchCaseRecords(string userId) {
        List<Case> caseList =new List<Case>();
        User usrDetails = SciExpUtilityCls.fetchUserDetails(userId)[0];
        system.debug('user details ==> '+UsrDetails.Name);
        if(usrDetails.AccountId != null ){
            caseList= [SELECT Id, CaseNumber,AccountId, Account.Name,subject,status,Type,Priority,Reason  FROM Case WHERE Accountid =: usrDetails.Accountid];
            system.debug('Community logged in user Caselist size '+caseList.size());
        }else{
            caseList = [select Id,CaseNumber,AccountId, Account.Name,subject,status,Type,Priority,Reason FROM Case WHERE ownerid =:usrDetails.id];
            system.debug('Logged in User Caselist Size ==> '+caseList.size());
        }
            return caselist;
    }
    
    /*
    @AuraEnabled(cacheable=true)
    public static void createNewCaseRecord(string userId,Case caseRecord) {
        List<Case> caseList =new List<Case>();
        User usrDetails = SciExpUtilityCls.fetchUserDetails(userId)[0];
        
    }*/
}