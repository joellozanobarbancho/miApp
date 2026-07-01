// Mapa de campos de datos para la plantilla (19 hojas).

export type FieldType = 'text' | 'textarea' | 'date' | 'checkbox'

export type TemplateField = {
  id: string
  label: string
  cellRef: string
  type: FieldType
  placeholder?: string
  verified: boolean
}

export type HeaderBlock = {
  // Bloque de identificación del sitio que se repite igual en varias hojas
  // (sommario, inquadramento, vista 1-5). Se rellena una sola vez en el paso
  // "Identificazione" (hoja testalino) y se propaga automáticamente al resto.
  codiceSito: string
  nomeSito: string
  indirizzo: string
  comune: string
  dataSopralluogo: string
}

export type TemplateStep = {
  sheetName: string
  title: string
  description?: string
  isAddressStep?: boolean // true solo para "testalino": aquí aparece geolocalización
  headerBlock?: HeaderBlock // si la hoja recibe el bloque de identificación propagado
  fields: TemplateField[]
}

function checkboxField(id: string, label: string, cellRef: string, verified = true): TemplateField {
  return { id, label, cellRef, type: 'checkbox', verified }
}

export const PLANTILLA4_STEPS: TemplateStep[] = [
  {
    sheetName: 'testalino',
    title: 'Identificazione e indirizzo',
    description: 'Datos del sitio. Aquí puedes usar tu ubicación actual para rellenar la dirección.',
    isAddressStep: true,
    fields: [
      { id: 'codiceSito', label: 'Codice sito', cellRef: 'E37', type: 'text', verified: true },
      { id: 'nomeSito', label: 'Nome sito', cellRef: 'I37', type: 'text', verified: true },
      { id: 'indirizzo', label: 'Indirizzo', cellRef: 'E38', type: 'text', verified: true },
      { id: 'comune', label: 'Comune', cellRef: 'I38', type: 'text', verified: true },
      { id: 'dataSopralluogo', label: 'Data sopralluogo', cellRef: 'E39', type: 'date', verified: true },
      { id: 'tipologiaDocumento', label: 'Tipologia documento', cellRef: 'G39', type: 'text', placeholder: 'Tipologia Documento: Allegato fotografico Sopralluogo', verified: true },
      checkboxField('tipologiaTraliccio', 'Traliccio', 'C28'),
      checkboxField('tipologiaPalo', 'Palo', 'C29'),
      checkboxField('tipologiaPaloStrallato', 'Palo strallato', 'C30'),
      checkboxField('tipologiaRipetitorePassivo', 'Ripetitore passivo', 'C31'),
      checkboxField('tipologiaRoofTop', 'Roof top', 'C32'),

      // --- Datos adicionales de identificación (formulario superior, legacy) ---
      { id: 'societaPresidio', label: 'Società/Presidio specialistico', cellRef: 'H10', type: 'text', verified: false },
      { id: 'codiceImmobiliareTral', label: 'Codice immobiliare/TRAL', cellRef: 'H12', type: 'text', verified: false },
      { id: 'codiceSitoRegionale', label: 'Codice sito regionale', cellRef: 'H16', type: 'text', verified: false },
      { id: 'clli', label: 'CLLI', cellRef: 'H18', type: 'text', verified: false },
      { id: 'eseguitoDa', label: 'Eseguito da', cellRef: 'H34', type: 'text', verified: false }
    ]
  },
  {
    sheetName: 'sommario',
    title: 'Sommario',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: []
  },
  {
    sheetName: 'scheda struttura',
    title: 'Scheda tecnica struttura (1/2)',
    fields: [
      { id: 'indirizzoStruttura', label: 'Indirizzo struttura', cellRef: 'J9', type: 'text', verified: true },
      { id: 'altezzaTotale', label: 'Altezza totale (mt)', cellRef: 'K10', type: 'text', verified: true },
      { id: 'formaBase', label: 'Forma base', cellRef: 'K11', type: 'text', verified: true },
      { id: 'dimensioneBase', label: 'Dimensione di base (mt)', cellRef: 'K12', type: 'text', verified: false },
      { id: 'dimensioneSommita', label: 'Dimensione sommità (mt)', cellRef: 'K13', type: 'text', verified: false },
      { id: 'annoInstallazione', label: "Anno d'installazione", cellRef: 'K14', type: 'text', verified: true },
      checkboxField('unioneMontantiCoprigiunto', 'coprigiunto', 'C17'),
      checkboxField('unioneMontantiSovrapposti', 'sovrapposti', 'C18'),
      checkboxField('unioneMontantiFlangiati', 'flangiati', 'C19'),
      checkboxField('unioneMontantiAltro', 'altro', 'C20'),
      checkboxField('unioneTralicciSezioneAperta', 'sezione aperta', 'F17'),
      checkboxField('unioneTralicciTuboAPaletta', 'tubo a paletta', 'F18'),
      checkboxField('unioneTralicciTuboSchiacciato', 'tubo schiacciato', 'F19'),
      checkboxField('unioneTralicciTuboSaldato', 'tubo saldato', 'F20'),
      checkboxField('tipoAngolare', 'angolare', 'I17'),
      checkboxField('tipoTubolare', 'tubolare', 'I18'),
      checkboxField('tipoMista', 'mista', 'I19'),
      checkboxField('tipoAltro', 'altro', 'I20'),
      checkboxField('formaRastremata', 'rastremata', 'L17'),
      checkboxField('formaParallela', 'parallela', 'L19'),
      checkboxField('formaAltro', 'altro', 'L20'),
      checkboxField('scalaGuidaAnticadutaSi', 'si', 'H29'),
      checkboxField('scalaGuidaAnticadutaNo', 'no', 'I29'),
      checkboxField('scalaGuardiacorpoSi', 'si', 'H30'),
      checkboxField('scalaGuardiacorpoNo', 'no', 'I30'),
      checkboxField('scalaChiusuraSi', 'si', 'H31'),
      checkboxField('scalaChiusuraNo', 'no', 'I31'),
      { id: 'osservazioni1', label: 'Osservazioni (esame struttura)', cellRef: 'F33', type: 'textarea', verified: true },
      { id: 'provvedimenti1', label: 'Provvedimenti (esame struttura)', cellRef: 'J33', type: 'textarea', verified: true },
      { id: 'osservazioni2', label: 'Osservazioni (sistema anti-accesso)', cellRef: 'F34', type: 'textarea', verified: true },
      { id: 'provvedimenti2', label: 'Provvedimenti (sistema anti-accesso)', cellRef: 'J34', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'scheda struttura (2)',
    title: 'Scheda tecnica struttura (2/2)',
    fields: [
      { id: 'osservazioniScale', label: 'Osservazioni (scale di accesso)', cellRef: 'F8', type: 'textarea', verified: true },
      { id: 'provvedimentiScale', label: 'Provvedimenti (scale di accesso)', cellRef: 'J8', type: 'textarea', verified: true },
      { id: 'osservazioniPianerottoli', label: 'Osservazioni (pianerottoli)', cellRef: 'F9', type: 'textarea', verified: true },
      { id: 'provvedimentiPianerottoli', label: 'Provvedimenti (pianerottoli)', cellRef: 'J9', type: 'textarea', verified: true },
      { id: 'osservazioniCartellonistica', label: 'Osservazioni (cartellonistica sicurezza)', cellRef: 'F10', type: 'textarea', verified: true },
      { id: 'provvedimentiCartellonistica', label: 'Provvedimenti (cartellonistica sicurezza)', cellRef: 'J10', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'organi radianti',
    title: "Organi radianti e guide d'onda (1/3)",
    fields: [
      { id: 'totaleCelleRadiomobili', label: 'Totale celle radiomobili', cellRef: 'E8', type: 'text', verified: true },
      { id: 'antennePerCella', label: 'Antenne per cella', cellRef: 'H8', type: 'text', verified: true },
      { id: 'totaleParabole', label: 'Totale parabole', cellRef: 'E14', type: 'text', verified: true },
      checkboxField('elementiObsoletiSi', 'si', 'I20'),
      checkboxField('elementiObsoletiNo', 'no', 'J20'),
      { id: 'posizioneElementiObsoleti', label: 'Posizione elementi obsoleti', cellRef: 'D21', type: 'text', verified: false },
      { id: 'descrizioneElementiObsoleti', label: 'Descrizione elementi obsoleti', cellRef: 'D22', type: 'textarea', verified: false }
    ]
  },
  {
    sheetName: 'organi radianti (2)',
    title: "Organi radianti e guide d'onda (2/3)",
    fields: [
      { id: 'osservazioniAttacchi', label: 'Osservazioni (attacchi parabole/celle)', cellRef: 'F8', type: 'textarea', verified: true },
      { id: 'provvedimentiAttacchi', label: 'Provvedimenti (attacchi parabole/celle)', cellRef: 'J8', type: 'textarea', verified: true },
      { id: 'osservazioniSupporti', label: 'Osservazioni (supporti/morsetti)', cellRef: 'F9', type: 'textarea', verified: true },
      { id: 'provvedimentiSupporti', label: 'Provvedimenti (supporti/morsetti)', cellRef: 'J9', type: 'textarea', verified: true },
      { id: 'osservazioniPasserella', label: 'Osservazioni (passerella portacavi)', cellRef: 'F10', type: 'textarea', verified: true },
      { id: 'provvedimentiPasserella', label: 'Provvedimenti (passerella portacavi)', cellRef: 'J10', type: 'textarea', verified: true },
      { id: 'osservazioniPassante', label: 'Osservazioni (passante stagno)', cellRef: 'F11', type: 'textarea', verified: true },
      { id: 'provvedimentiPassante', label: 'Provvedimenti (passante stagno)', cellRef: 'J11', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'organi radianti (3)',
    title: "Organi radianti e guide d'onda (3/3)",
    fields: [
      { id: 'modelloParabola1', label: 'Modello parabola 1', cellRef: 'D8', type: 'text', verified: false },
      { id: 'diametroParabola1', label: 'Diametro parabola 1', cellRef: 'J8', type: 'text', verified: false },
      { id: 'osservazioniCorpoParabola', label: 'Osservazioni (corpo parabola)', cellRef: 'F15', type: 'textarea', verified: true },
      { id: 'provvedimentiCorpoParabola', label: 'Provvedimenti (corpo parabola)', cellRef: 'J15', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'BULLONERIA',
    title: 'Bulloneria',
    fields: [
      checkboxField('tipoZincaturaElettrolitica', 'zincatura elettrolitica', 'F7'),
      checkboxField('tipoAssente', 'assente', 'L7'),
      checkboxField('antisvitamentoPallNuts', 'pall-nuts', 'L8'),
      checkboxField('zincaturaABagno', 'zincatura a bagno', 'F9'),
      checkboxField('antisvitamentoRondGroover', 'rond groover', 'L9'),
      { id: 'strumentoUtilizzato', label: 'Strumento utilizzato', cellRef: 'F13', type: 'text', verified: true },
      { id: 'matricola', label: 'Matricola n°', cellRef: 'F14', type: 'text', verified: true },
      { id: 'scadenzaTaratura', label: 'Scadenza taratura', cellRef: 'K14', type: 'date', verified: true },
      { id: 'osservazioniBulloneria', label: 'Osservazioni', cellRef: 'F39', type: 'textarea', verified: true },
      { id: 'provvedimentiBulloneria', label: 'Provvedimenti', cellRef: 'J39', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'VERNICIATURA',
    title: 'Verniciatura e antiossido',
    fields: [
      checkboxField('protezioneAssente', 'assente', 'D7'),
      checkboxField('protezioneZincaturaCaldo', 'zincatura a caldo', 'F7'),
      checkboxField('protezioneZincaturaFreddo', 'zincatura a freddo', 'J7'),
      checkboxField('verniciaturaAssente', 'assente', 'D8'),
      checkboxField('verniciaturaParziale', 'parziale', 'F8'),
      checkboxField('verniciaturaTotale', 'totale', 'H8'),
      checkboxField('presenzaOssidazioneSi', 'si', 'C25'),
      checkboxField('presenzaOssidazioneNo', 'no', 'E25'),
      { id: 'coloreVerniciatura', label: 'Colore', cellRef: 'K8', type: 'text', verified: true },
      { id: 'osservazioniVerniciatura', label: 'Osservazioni', cellRef: 'F35', type: 'textarea', verified: true },
      { id: 'provvedimentiVerniciatura', label: 'Provvedimenti', cellRef: 'J35', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'TERRA',
    title: 'Impianto di terra e parafulmine',
    fields: [
      checkboxField('dispersoreCorda', 'corda', 'C9'),
      checkboxField('dispersoreCordaGV', 'corda g/v', 'C10'),
      checkboxField('dispersoreBandella', 'bandella', 'C11'),
      checkboxField('dispersoreFilo', 'filo', 'C12'),
      checkboxField('materialeRame', 'rame', 'E9'),
      checkboxField('materialeAcciaio', 'acciaio', 'E12'),
      checkboxField('rivestimentoNudo', 'nudo', 'G9'),
      checkboxField('rivestimentoIsolato', 'isolato', 'G12'),
      checkboxField('calateStrutturaSi', 'si', 'E15'),
      checkboxField('calateStrutturaNo', 'no', 'F15'),
      checkboxField('collegamentoTerraCentraleSi', 'si', 'F17'),
      checkboxField('collegamentoTerraCentraleNo', 'no', 'G17'),
      checkboxField('faradaySi', 'si', 'F19'),
      checkboxField('faradayNo', 'no', 'G19'),
      checkboxField('parafulminePresenteSi', 'si', 'D26'),
      checkboxField('parafulminePresenteNo', 'no', 'E26'),
      checkboxField('astaFranklianaSi', 'si', 'J26'),
      checkboxField('astaFranklianaNo', 'no', 'K26'),
      { id: 'noteTerra', label: 'Note', cellRef: 'C21', type: 'textarea', verified: true },
      { id: 'osservazioniTerra', label: 'Osservazioni (messa a terra)', cellRef: 'F37', type: 'textarea', verified: true },
      { id: 'provvedimentiTerra', label: 'Provvedimenti (messa a terra)', cellRef: 'J37', type: 'textarea', verified: true },
      { id: 'osservazioniParafulmine', label: 'Osservazioni (parafulmine)', cellRef: 'F39', type: 'textarea', verified: true },
      { id: 'provvedimentiParafulmine', label: 'Provvedimenti (parafulmine)', cellRef: 'J39', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'SOV',
    title: 'SOV e impianto elettrico',
    fields: [
      checkboxField('sovDiurnoAssente', 'assente', 'E8'),
      checkboxField('sovDiurnoSoloTerzoSuperiore', 'solo terzo superiore', 'G8'),
      checkboxField('sovDiurnoTotale', 'totale', 'K8'),
      checkboxField('alternanzaSettoriSi', 'si', 'K9'),
      checkboxField('alternanzaSettoriNo', 'no', 'L9'),
      checkboxField('sovNotturnoSi', 'si', 'G11'),
      checkboxField('sovNotturnoNo', 'no', 'I11'),
      checkboxField('segnalatoriFunzionantiSi', 'si', 'G19'),
      checkboxField('segnalatoriFunzionantiNo', 'no', 'H19'),
      checkboxField('alimentazioneCaviSi', 'si', 'K21'),
      checkboxField('alimentazioneCaviNo', 'no', 'L21'),
      checkboxField('calateInterne', 'interne alla sagoma', 'E22'),
      checkboxField('calateMontanti', 'lungo i montanti', 'I22'),
      checkboxField('interruttoreCrepuscolareSi', 'si', 'G30'),
      checkboxField('interruttoreCrepuscolareNo', 'no', 'I30'),
      checkboxField('alimentatoreUpsSi', 'si', 'G31'),
      checkboxField('alimentatoreUpsNo', 'no', 'I31'),
      checkboxField('scaricatoriSi', 'si', 'G32'),
      checkboxField('scaricatoriNo', 'no', 'I32'),
      { id: 'numeroSegnalatori', label: 'Numero segnalatori luminosi', cellRef: 'D12', type: 'text', verified: false },
      { id: 'altezzaMassimaSov', label: 'Altezza massima SOV notturno', cellRef: 'D13', type: 'text', verified: false }
    ]
  },
  {
    sheetName: 'fondazioni',
    title: 'Fondazioni',
    fields: [
      { id: 'tipologiaFondazioni', label: 'Tipologia', cellRef: 'B8', type: 'text', verified: true },
      { id: 'ancoraggiFondazioni', label: 'Ancoraggi', cellRef: 'F8', type: 'text', verified: true },
      { id: 'osservazioniPlinti', label: 'Osservazioni (plinti)', cellRef: 'F35', type: 'textarea', verified: true },
      { id: 'provvedimentiPlinti', label: 'Provvedimenti (plinti)', cellRef: 'J35', type: 'textarea', verified: true },
      { id: 'osservazioniBulloniAncoraggio', label: 'Osservazioni (bulloni ancoraggio)', cellRef: 'F36', type: 'textarea', verified: true },
      { id: 'provvedimentiBulloniAncoraggio', label: 'Provvedimenti (bulloni ancoraggio)', cellRef: 'J36', type: 'textarea', verified: true }
    ]
  },
  {
    sheetName: 'riferimenti normativi',
    title: 'Rispondenza normativa',
    fields: [
      checkboxField('corrispondenzaStrutturaSi', 'si', 'K8'),
      checkboxField('corrispondenzaStrutturaNo', 'no', 'L8'),
      { id: 'noteNormativa', label: 'Note', cellRef: 'D33', type: 'textarea', verified: true },
      { id: 'provvedimentiNormativa', label: 'Provvedimenti riassuntivi', cellRef: 'D35', type: 'textarea', verified: true },
      { id: 'dataEmissione', label: 'Data di emissione', cellRef: 'C45', type: 'date', verified: true },
      { id: 'tecnicoAbilitato', label: 'Tecnico abilitato', cellRef: 'F45', type: 'text', verified: true },
      { id: 'direttoreTecnico', label: 'Direttore Tecnico', cellRef: 'I45', type: 'text', verified: true }
    ]
  },
  {
    sheetName: 'inquadramento',
    title: 'Foto: inquadramento generale',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: [
      { id: 'caption', label: 'Descrizione foto', cellRef: 'E25', type: 'text', placeholder: '1_Inquadramento Generale', verified: true }
    ]
  },
  {
    sheetName: 'vista 1',
    title: 'Foto: vista 1',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: [
      { id: 'caption', label: 'Descrizione foto', cellRef: 'E29', type: 'text', placeholder: '2_Vista generale del sito', verified: true }
    ]
  },
  {
    sheetName: 'vista 2',
    title: 'Foto: vista 2',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: [
      { id: 'caption', label: 'Descrizione foto', cellRef: 'D29', type: 'text', placeholder: '3_Dettaglio antenne', verified: true }
    ]
  },
  {
    sheetName: 'vista 3',
    title: 'Foto: vista 3',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: [
      { id: 'caption', label: 'Descrizione foto', cellRef: 'E29', type: 'text', placeholder: '3_Dettaglio fondazione', verified: true }
    ]
  },
  {
    sheetName: 'vista 4',
    title: 'Foto: vista 4',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: [
      { id: 'caption', label: 'Descrizione foto', cellRef: 'E29', type: 'text', placeholder: '4_Gabbia parauomo da ripristinare', verified: true }
    ]
  },
  {
    sheetName: 'vista 5',
    title: 'Foto: vista 5',
    headerBlock: { codiceSito: 'D32', nomeSito: 'I32', indirizzo: 'D33', comune: 'I33', dataSopralluogo: 'D34' },
    fields: [
      { id: 'caption', label: 'Descrizione foto', cellRef: 'E28', type: 'text', placeholder: '5_Carter da fissare in modo adeguato', verified: true }
    ]
  }
]

export function getStep(sheetName: string): TemplateStep | undefined {
  return PLANTILLA4_STEPS.find((step) => step.sheetName === sheetName)
}

export const PLANTILLA3_STEPS = PLANTILLA4_STEPS
