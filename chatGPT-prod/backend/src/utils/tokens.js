// crude token estimator: approximate 1 token ~= 4 chars on average
export function estimateTokensFromText(text){
  if(!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateTokensFromMessages(messages = []){
  let s = '';
  for(const m of messages) s += (m.content || '') + ' ';
  return estimateTokensFromText(s);
}
