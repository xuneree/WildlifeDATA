import initialMapping from './label-mapping.json' with { type: 'json' };
export type LabelMapping = { humanInterference: string[] };
export const defaultLabelMapping: LabelMapping = initialMapping;
export const labelMappingStorageKey = 'wildlifedata-module02-label-mapping-v1';
export function validateLabelMapping(mapping: LabelMapping): LabelMapping {
  if (!Array.isArray(mapping?.humanInterference) || mapping.humanInterference.some(label => typeof label !== 'string')) throw new Error('原始标签格式无效');
  const labels = [...new Set(mapping.humanInterference.map(label => label.trim()).filter(Boolean))];
  if (labels.includes('人类干扰')) throw new Error('“人类干扰”已是筛选标签，不需要再映射到自身');
  return { humanInterference: labels };
}
export function loadLabelMapping(): LabelMapping {
  try {
    const stored = localStorage.getItem(labelMappingStorageKey);
    if (stored) return validateLabelMapping(JSON.parse(stored));
  } catch { /* A bad cache does not replace the versioned default. */ }
  return { humanInterference: [...defaultLabelMapping.humanInterference] };
}
export function saveLabelMapping(mapping: LabelMapping): LabelMapping {
  const next = validateLabelMapping(mapping);
  localStorage.setItem(labelMappingStorageKey, JSON.stringify(next));
  return next;
}
