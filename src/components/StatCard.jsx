export default function StatCard({title,value,darkMode}){
  const handleMouseEnter = (e) => (e.currentTarget.style.opacity = "0.8");
  const handleMouseLeave = (e) => (e.currentTarget.style.opacity = "1");

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: "16px",
        padding: "24px",
        textAlign: "center",
        background: darkMode ? "#1e293b" : "#ffffff",
        color: darkMode ? "#f8fafc" : "#0f172a",
        boxShadow: darkMode 
          ? "0 4px 20px rgba(0,0,0,0.4)" 
          : "0 4px 20px rgba(0,0,0,0.05)",
        minHeight: "140px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
            <h3 style={{fontSize:"14px",color:darkMode?"#94a3b8":"#6b7280"}}>{title}</h3>
            <p style={{fontSize:"28px",fontWeight:"bold",marginTop:"10px"}}>
                {value}
            </p>
        </div>
    );
}