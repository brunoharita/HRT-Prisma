// Purpose-bound outbox only. It cannot generate questions or create invitations.
export async function drainAssessmentEmails(config,fetcher=fetch){
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.supabaseUrl??'')||(config.dispatcherSecret?.length??0)<40||!config.publishableKey)throw Error('ASSESSMENT_DISPATCH_CONFIGURATION');
 const response=await fetcher(`${config.supabaseUrl}/functions/v1/position-assessment`,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(180000),body:JSON.stringify({contract:'position-assessment-1.0.0',action:'drain',workerSecret:config.dispatcherSecret})});
 if(!response.ok)throw Error('ASSESSMENT_DISPATCH_UNAVAILABLE');
 const value=await response.json();if(!Number.isSafeInteger(value.processed)||value.processed<0||value.processed>10)throw Error('ASSESSMENT_DISPATCH_RECEIPT_INVALID');return {processed:value.processed};
}
