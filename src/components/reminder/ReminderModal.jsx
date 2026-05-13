const { error } = await supabase
  .from("reminders")
  .insert({
    user_id: user.id,
    title,
    description,
    remind_at: selectedDate
  });

  const { data } = await supabase
  .from("reminders")
  .select("*")
  .order("remind_at", { ascending: true });

  