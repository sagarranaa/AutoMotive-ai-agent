export function seedData() {
 const drive=new Date(Date.now()+2*86400000); drive.setUTCHours(5,30,0,0);
 const delivery=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
 return {
  Leads:[{id:'lead-rajesh',fullName:'Rajesh Sharma',phone:'9000000001',email:'rajesh@example.com',city:'Pune',vehicle:'Thar',status:'Not Contacted'}],
  Contacts:[{id:'contact-priya',fullName:'Priya Patel',phone:'9000000002',email:'priya@example.com'}, {id:'contact-arjun',fullName:'Arjun Mehta',phone:'9000000003',email:'arjun@example.com'}],
  Deals:[{id:'deal-priya',name:'Priya Patel - XUV700',phone:'9000000002',vehicle:'XUV700',stage:'Test Drive Scheduled',testDriveAt: drive.toISOString().slice(0, 19) + '+00:00',quote:2200000,dealer:'ABC Pune Demo Motors · 020-0000-0000 (fictional)',followUp:'Phone in the morning',contactId:'contact-priya'},
   {id:'deal-booking',name:'Arjun Mehta - Scorpio-N Z8L',phone:'9000000003',vehicle:'Scorpio-N',stage:'Closed Won - Booking Done',bookingId:'MAH-9921',allocationStage:'In Transit',deliveryDate:delivery,vin:null,paymentUrl:null,contactId:'contact-arjun'}],
  Cases:[]
 };
}
