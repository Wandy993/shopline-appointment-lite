import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  bookingId:{type:mongoose.Schema.Types.ObjectId,ref:'Booking',required:true,index:true}, shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},
  occurrenceKey:{type:String,required:true,maxlength:300}, audience:{type:String,enum:['customer','merchant'],required:true}, leadHours:{type:Number,default:24},
  status:{type:String,enum:['pending','sent','failed'],default:'pending',index:true}, claimedAt:Date,lastAttemptAt:Date,sentAt:Date,lastError:{type:String,default:'',maxlength:500}
},{timestamps:true});
schema.index({bookingId:1,occurrenceKey:1,audience:1},{unique:true,name:'one_email_reminder_per_occurrence_audience'});
export const EmailReminderDelivery = mongoose.model('EmailReminderDelivery', schema);
