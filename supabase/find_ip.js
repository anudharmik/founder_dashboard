import fetch from 'node-fetch';

async function resolveDns() {
  console.log("Resolving db.nxtcrjszmxqyaixpthpb.supabase.co via Google DNS API...");
  try {
    const resA = await fetch('https://dns.google/resolve?name=db.nxtcrjszmxqyaixpthpb.supabase.co&type=A');
    const jsonA = await resA.json();
    console.log("A records (IPv4):", jsonA.Answer);

    const resAAAA = await fetch('https://dns.google/resolve?name=db.nxtcrjszmxqyaixpthpb.supabase.co&type=AAAA');
    const jsonAAAA = await resAAAA.json();
    console.log("AAAA records (IPv6):", jsonAAAA.Answer);

    const resCNAME = await fetch('https://dns.google/resolve?name=db.nxtcrjszmxqyaixpthpb.supabase.co&type=CNAME');
    const jsonCNAME = await resCNAME.json();
    console.log("CNAME records:", jsonCNAME.Answer);
  } catch (e) {
    console.error("DNS lookup error:", e);
  }
}

resolveDns();
