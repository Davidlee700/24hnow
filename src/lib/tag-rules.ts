export function inferTags(name: string, category: string): string[] {
  const tags: string[] = [];

  if (category === '카페') {
    if (/무인/.test(name)) tags.push('무인카페');
    if (/만화/.test(name)) tags.push('만화카페');
    if (/스타벅스|이디야|메가|투썸|컴포즈|빽다방|할리스|커피빈|탐앤탐/.test(name)) tags.push('대형카페');
  }

  if (category === '편의점') {
    if (/CU|GS25|세븐일레븐|이마트24|미니스톱/.test(name)) tags.push('상비약완비');
    if (/무인/.test(name)) tags.push('무인편의점');
  }

  if (category === '셀프빨래방' || category === '코인빨래방') {
    tags.push('건조기완비');
    if (/무인/.test(name)) tags.push('무인카페운영');
  }

  if (category === '약국') {
    tags.push('상비약');
  }

  return tags;
}
