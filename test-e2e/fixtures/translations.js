const commonPreset = {
  /** @type {'translation'} */
  schemaName: 'translation',
  schemaNameRef: 'preset',
  languageCode: 'es',
  regionCode: 'AR',
  fieldRef: 'name',
}

/** @type {Object.<string,string>} */
export const translationMap = {
  Airstrip: 'Pista de Aterrizaje',
  Boundry: 'Límite',
  Cave: 'Cueva',
  Building: 'Edificio',
  Clay: 'Arcilla',
  'New Area': 'Nueva Área',
  Camp: 'Campamento',
  Community: 'Comunidad',
  'Gathering Site': 'Zona de recolección',
  Hills: 'Colinas',
  House: 'Casa',
  'Hunting Site': 'Sitio de Caza',
  'Fishing Site': 'Sitio de Pesca',
  Palm: 'Palma',
  Plant: 'Planta',
  Path: 'Camino',
  'New point': 'Nuevo punto',
  River: 'Río',
  'New line': 'Nueva línea',
  Lake: 'Lago',
  Stream: 'Cauce',
  'Special site': 'Sitio especial',
  Farmland: 'Tierra de cultivo',
  Threat: 'Amenaza',
  Waterfall: 'Cascada',
  Tree: 'Árbol',
}

export const presetTranslations = Object.keys(translationMap).map((key) => {
  const translation = translationMap[key]
  return { ...commonPreset, message: translation }
})
