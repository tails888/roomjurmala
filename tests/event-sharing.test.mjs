import test from 'node:test';
import assert from 'node:assert/strict';
import {sharingText,googleProfileUrl} from '../assets/js/event-sharing.mjs';
test('Google handoff uses the chosen occurrence, Latvian content and correct venue',()=>{
  const text = sharingText({title:{lv:'Jogas nodarbība'},description:{lv:'Paņem paklājiņu.'},start:'2026-09-22',time:'19:00-20:30',weekdays:[2]},'2026-09-29');
  assert.match(text,/29/); assert.match(text,/19:00–20:30/); assert.match(text,/Paņem paklājiņu/);
  assert.match(text,/Atkārtojas katru nedēļu/); assert.match(text,/https:\/\/roomjurmala.lv\/#calendar/);
  assert.equal(new URL(googleProfileUrl).hostname,'maps.google.com');
});
