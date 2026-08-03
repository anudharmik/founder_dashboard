import fetch from 'node-fetch';

async function checkRestDns() {
  const res = await fetch('https://dns.google/resolve?name=nxtcrjszmxqyaixpthpb.supabase.co&type=A');
  const json = await res.json();
  console.log("Rest A records (IPv4):", json.Answer);
}

checkRestDns();
