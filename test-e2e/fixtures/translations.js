const commonPreset = {
  /** @type {'translation'} */
  schemaName: 'translation',
  /** @type {import('@mapeo/schema').TranslationValue['docRefType']} */
  docRefType: 'preset',
  languageCode: 'es',
  regionCode: 'AR',
  propertyRef: 'name',
}

const commonField = {
  /** @type {'translation'} */
  schemaName: 'translation',
  /** @type {import('@mapeo/schema').TranslationValue['docRefType']} */
  docRefType: 'field',
  languageCode: 'es',
  regionCode: 'AR',
  propertyRef: 'label',
}

/** @type {Object.<string,string>} */
export const presetsTranslationMap = {
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

/** @type {Object.<string,string>} */
export const fieldsTranslationMap = {
  'Animal type': 'Tipo de animal',
  'Building type': 'Tipo de edificio',
  'What is gathered here?': '¿Qué se recolecta aquí?',
  Note: 'Nota',
  Owner: 'Dueño',
  'Plant species': 'Especie de planta',
  'What kind of path?': '¿Qué clase de camino?',
  Name: 'Nombre',
  'Tree species': 'Especie de árbol',
}

export const presetTranslations = Object.keys(presetsTranslationMap).map(
  (key) => {
    const translation = presetsTranslationMap[key]
    return { ...commonPreset, message: translation }
  }
)

export const fieldTranslations = Object.keys(fieldsTranslationMap).map(
  (key) => {
    const translation = fieldsTranslationMap[key]
    return { ...commonField, message: translation }
  }
)
