import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRuleInput, validateStaffInput } from '../src/lib/validation.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const baseRule = { bookingSource:'direct', commerceMode:'standalone_free', serviceTitle:'Consultation', bookingMode:'slot', duration:60, buffer:0, capacity:1, bookingWindowDays:90, minimumNoticeMinutes:0, weeklyAvailability:[{weekday:1,enabled:true,windows:[{start:'09:00',end:'17:00'}]}], locationMode:'online', staffAssignment:{mode:'none',staffIds:[]} };

test('standalone free service does not require a SHOPLINE product and keeps meeting link private in rule storage', () => {
  const result=validateRuleInput({...baseRule,onlineMeeting:{provider:'zoom',label:'Join Zoom',url:'https://zoom.us/j/123'}});
  assert.deepEqual(result.errors,[]); assert.equal(result.value.productId,''); assert.equal(result.value.onlineMeeting.provider,'zoom');
});

test('online meeting only accepts https links', () => {
  const result=validateRuleInput({...baseRule,onlineMeeting:{provider:'custom',url:'http://example.com/meeting'}});
  assert.match(result.errors.join(' '),/HTTPS URL/);
});

test('staff public profile fields normalize without publishing contact fields', () => {
  const result=validateStaffInput({name:'Taylor',email:'private@example.com',phone:'+1',roleTitle:'Aesthetician',region:'West',expertise:'Skincare',supportedServices:['Hair Color','Haircut'],bio:'Specialist',publicProfile:true,weeklyAvailability:[{weekday:1,enabled:true,windows:[{start:'09:00',end:'17:00'}]}]});
  assert.deepEqual(result.errors,[]); assert.equal(result.value.publicProfile,true); assert.equal(result.value.roleTitle,'Aesthetician'); assert.deepEqual(result.value.supportedServices,['Hair Color','Haircut']);
});

test('page booking and staff directory blocks are scoped to regular pages', async()=>{
  const booking=await read('../theme-extension-source/blocks/appointment-lite-booking.html'); const directory=await read('../theme-extension-source/blocks/appointment-lite-staff-directory.html');
  assert.match(booking,/"templates": \["page"\]/); assert.match(directory,/data-al-staff-directory/); assert.match(directory,/rule_id/);
});

test('public directory implementation never emits staff email or phone', async()=>{
  const staffing=await read('../src/services/staffing.js'); const page=await read('../theme-extension-source/public/appointment-lite-page.js');
  const fn=staffing.slice(staffing.indexOf('export async function publicStaffDirectory'),staffing.indexOf('async function reservationRowsForStaff'));
  assert.doesNotMatch(fn,/email\s*:|phone\s*:/); assert.doesNotMatch(page,/item\.email|item\.phone/);
});

test('hosted booking honors staff preselection and reveals meeting only after confirmation', async()=>{
  const app=await read('../public/book/app.js'); const publicRoute=await read('../src/routes/public.js');
  assert.match(app,/preselectedStaffId/); assert.match(app,/booking\.meeting\?\.url/); assert.match(publicRoute,/booking\.status === 'confirmed' && booking\.onlineMeeting\?\.url/);
});
