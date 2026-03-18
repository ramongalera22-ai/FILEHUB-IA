/**
 * Itinerario Nueva York — Carlos — Abril 2026
 * ESTRUCTURA EXACTA del usuario + costes recalculados
 *
 * REGLAS DE COSTE:
 * - Desayuno días 1-6: INCLUIDO en LIC Plaza → 0€
 * - Día 7: Pod Brooklyn NO incluye desayuno → ~14€ brunch
 * - Cenas: SUPERMERCADO (~6-8€) excepto aeropuerto (~10€)
 * - 🤑 = ya pagado (no resta del presupuesto libre)
 * - Presupuesto libre: 230€
 */

export const NY_ITINERARY_PRESET = {
  destination: "Nueva York, EEUU",
  summary: "7 días en la Gran Manzana con base en LIC Plaza Queens (desayuno incluido) y última noche en Pod Brooklyn. Vuelo BCN→JFK el miércoles 18 abril, vuelta JFK→BCN martes 24 noche. Ritmo tranquilo: Summit, MOMA, Broadway Chicago, High Line, Brooklyn, Williamsburg. Cenas de supermercado para maximizar experiencias pagadas.",
  totalDays: 7,
  estimatedTotal: 221,
  currency: "EUR",
  bestTimeToVisit: "Abril — primavera perfecta, 12-18°C de día",
  language: "Inglés (algo de español en Queens y Brooklyn)",
  currency_info: "USD. Toca directamente con tu tarjeta española o Apple Pay en el metro (OMNY, ~2.90$/viaje). Sin MetroCard. Ten 20-30$ efectivo para propinas y mercados. 1$ ≈ 0.92€.",
  days: [
    {
      day: 1,
      date: "2026-04-18",
      title: "Llegada — BCN 17:35 → NY 22:00 · LIC Hotel",
      theme: "Vuelo LEVEL · Llegada JFK · Check-in",
      activities: [
        { time: "17:35", title: "✈️ Salida BCN — Vuelo LEVEL", type: "transport", description: "T2 Barcelona. Vuelo directo 10h a JFK.", duration: "10h", cost: 0, tip: "Ya pagado. Lleva cargador y auriculares.", mustSee: false },
        { time: "22:00", title: "🛬 Aterrizaje JFK — Terminal 1", type: "transport", description: "Inmigración, maleta, aduanas. Ten ESTA activo en el móvil y dirección del hotel: LIC Plaza, 29-17 40th Rd, Queens.", duration: "1h", cost: 0, tip: "Cola inmigración 30-60 min. Normal. No desesperes.", mustSee: false },
        { time: "23:00", title: "🚇 AirTrain + Metro → LIC Plaza", type: "transport", description: "AirTrain hasta Jamaica Station. Metro E/J hasta Queens Plaza. Hotel a 3 min andando.", duration: "50 min", cost: 8, tip: "Toca con tu tarjeta española en el lector OMNY directamente. Sin MetroCard.", mustSee: false },
        { time: "23:55", title: "🏨 Check-in LIC Plaza Hotel", type: "hotel", description: "Base los próximos 5 días. Desayuno incluido cada mañana. Queens — tranquilo y bien conectado.", duration: "", cost: 0, tip: "Ya pagado. Pide habitación alta para vistas al skyline si hay disponible.", mustSee: false }
      ],
      meals: { breakfast: "En el avión", lunch: "En el avión", dinner: "Snack en JFK si hay hambre (~5€) o dormir directo" },
      tips: ["Intenta aguantar hasta las 23h hora local para resetear el jet lag", "Carga todos los dispositivos en el avión"],
      estimatedCost: 8
    },
    {
      day: 2,
      date: "2026-04-19",
      title: "Midtown — Grand Central · Summit · 5ª Av · St Patrick",
      theme: "Rascacielos · Arquitectura · Lujo · Manhattan clásico",
      activities: [
        { time: "08:00", title: "☕ Desayuno hotel (incluido)", type: "food", description: "Buffet LIC Plaza. Incluido. Come bien.", duration: "30 min", cost: 0, tip: "Incluido — 0€.", mustSee: false },
        { time: "09:00", title: "🏛️ Grand Central Terminal", type: "sight", description: "Una de las estaciones más espectaculares del mundo. Techo constelado, Whispering Gallery y mercado en el sótano. Completamente gratis.", duration: "1h", cost: 0, tip: "Busca la Whispering Gallery: habla en la pared de la bóveda y se oye al otro lado. Gratis y mágico.", mustSee: true },
        { time: "10:30", title: "🌆 Summit One Vanderbilt 🤑", type: "sight", description: "El mirador más moderno de NY (2021). Habitaciones de espejos infinitos, plataforma de cristal exterior, vistas 360° de Manhattan. Junto a Grand Central — 45 Vanderbilt Ave.", duration: "1.5h", cost: 35, tip: "🤑 Confirmar si ya está pagado. Si no: reserva online. Mejor con sol de mañana para fotos.", mustSee: true },
        { time: "12:00", title: "🌮 Comida — Halal Cart o área de Grand Central", type: "food", description: "Halal Cart en 6th Ave con 53rd St: arroz + pollo + salsa blanca/picante por ~8$. El más famoso de NY.", duration: "45 min", cost: 9, tip: "Pide 'chicken over rice, white sauce AND hot sauce'. Rápido, barato, delicioso.", mustSee: false },
        { time: "14:00", title: "⛪ 5ª Avenida + St Patrick's Cathedral", type: "sight", description: "La catedral gótica más impresionante de Manhattan. Gratis. Luego paseo por la 5ª Av — Rockefeller Center, Saks Fifth Avenue, el NY más icónico.", duration: "2h", cost: 0, tip: "Entra a la catedral — el interior en contraste con los rascacielos que se ven por las ventanas es único.", mustSee: true },
        { time: "20:00", title: "🛒 Cena supermercado", type: "food", description: "Whole Foods en Columbus Circle (10 Columbus Cir) o Trader Joe's en 72nd St. Sección preparados: sushi, ensaladas, pasta.", duration: "45 min", cost: 7, tip: "Whole Foods tiene zona donde comer dentro con wifi. Calidad alta, precio razonable.", mustSee: false }
      ],
      meals: { breakfast: "✅ Hotel incluido (0€)", lunch: "Halal Cart 6th Ave (~9€)", dinner: "🛒 Whole Foods / Trader Joe's (~7€)" },
      tips: ["Metro desde LIC: línea 7 hasta Times Square, o E hasta 5th Av-53St", "El Summit: mejor con luz de mañana para las fotos"],
      estimatedCost: 51
    },
    {
      day: 3,
      date: "2026-04-20",
      title: "Lower Manhattan — Wall St · 11S · Cortlandt · Chinatown · Roosevelt",
      theme: "Historia · Calatrava · Barrios étnicos · East Village",
      activities: [
        { time: "08:00", title: "☕ Desayuno hotel (incluido)", type: "food", description: "Buffet LIC Plaza.", duration: "30 min", cost: 0, tip: "Incluido — 0€.", mustSee: false },
        { time: "09:00", title: "🐂 Toro Wall St + Memorial 11S", type: "sight", description: "El toro de Bowling Green (foto rápida, ve pronto). Luego el Memorial 9/11: las dos piscinas en el lugar exacto de las Torres. Emocionante y cuidado. Exterior completamente gratis.", duration: "1.5h", cost: 0, tip: "A las 9h el toro tiene menos gente. El memorial exterior es gratis — el museo cuesta ~33$, es opcional.", mustSee: true },
        { time: "11:00", title: "⚡ Cortlandt St Station — Oculus Calatrava", type: "sight", description: "La estación de metro más fotogénica del mundo. Arquitectura de Calatrava — un esqueleto blanco de dinosaurio. Gratis. La foto: en el centro mirando al techo.", duration: "45 min", cost: 0, tip: "Entra por el World Trade Center. La foto mirando al techo abierto es la más compartida de NY.", mustSee: true },
        { time: "12:00", title: "⛪ Trinity Church + Battery Park", type: "sight", description: "Trinity Church 1846 (aquí está Alexander Hamilton). Battery Park: vistas a la Estatua de la Libertad sin pagar el ferry.", duration: "45 min", cost: 0, tip: "Desde Battery Park ves la Estatua perfectamente. El ferry (~24$) no es necesario.", mustSee: false },
        { time: "12:30", title: "🍜 Comida Chinatown", type: "food", description: "Joe's Shanghai en 9 Pell St: soup dumplings (XLB) legendarios. O callejero en Mott St por 5-7$. El Chinatown más auténtico de EEUU.", duration: "1h", cost: 10, tip: "Joe's Shanghai: pide 'soup dumplings' y sorbe con cuidado — están hirviendo dentro. Reserva o llega pronto.", mustSee: true },
        { time: "14:30", title: "🚡 Teleférico de Roosevelt Island", type: "activity", description: "El teleférico más espectacular y barato de NY. Sale de 2nd Ave con 59th St. Vistas aéreas del East River y Midtown. Solo cuesta un metro (~2.90$).", duration: "1h", cost: 3, tip: "OMNY con tu tarjeta. Baja en la isla, camina al extremo sur, vuelve en teleférico.", mustSee: true },
        { time: "17:00", title: "🎨 East Village a pie", type: "free", description: "NY bohemio y auténtico. St. Marks Place, Tompkins Square Park, murales callejeros. Sin turistas de postal.", duration: "2h", cost: 0, tip: "Mural de David Bowie en Lafayette St. Tienda de vinillos 'Sounds' en St. Marks Place.", mustSee: false },
        { time: "19:30", title: "🛒 Cena supermercado East Village", type: "food", description: "Trader Joe's en 142 E 14th St. Come en Tompkins Square Park — ambiente local puro.", duration: "45 min", cost: 6, tip: "Al parque de noche: skaters, músicos, perros. Más real que cualquier restaurante turístico.", mustSee: false }
      ],
      meals: { breakfast: "✅ Hotel incluido (0€)", lunch: "Chinatown Joe's Shanghai (~10€)", dinner: "🛒 Trader Joe's East Village (~6€)" },
      tips: ["Todo el recorrido caminable desde Wall St hasta East Village (~4km)", "Oculus tiene mejor luz antes de las 14h"],
      estimatedCost: 19
    },
    {
      day: 4,
      date: "2026-04-21",
      title: "Tour de Contrastes · Katz's · Puente Brooklyn · DUMBO",
      theme: "NY real · Barrios auténticos · Brooklyn",
      activities: [
        { time: "08:00", title: "☕ Desayuno hotel (incluido)", type: "food", description: "Buffet LIC Plaza.", duration: "30 min", cost: 0, tip: "Incluido — 0€.", mustSee: false },
        { time: "09:45", title: "🚌 Tour de Contrastes VIP 🤑", type: "activity", description: "Punto de salida: 325 W 49th St, Midtown. 5 horas en minibús: South Bronx (origen hip-hop), East Harlem, Queens, Brooklyn. Guía local que conoce de dentro. Termina en Little Italy/Chinatown.", duration: "5h", cost: 50, tip: "🤑 Confirmar si ya pagado. No llegues tarde — puntual. Uno de los mejores del viaje.", mustSee: true },
        { time: "14:30", title: "🥩 Comida — Katz's Delicatessen", type: "food", description: "El deli más famoso de NY desde 1888 en Lower East Side. La escena de Harry y Sally se rodó aquí. Pastrami on rye: brutal. Caro pero experiencia única.", duration: "1h", cost: 22, tip: "Guarda el ticket o no puedes salir. Pide el pastrami sandwich — el rey de Katz's. Caro pero irrepetible.", mustSee: true },
        { time: "16:00", title: "🌉 Puente de Brooklyn + DUMBO", type: "sight", description: "Cruzar el puente a pie desde Manhattan (40 min). DUMBO: el barrio más fotogénico. Washington Street con el puente de Manhattan al fondo: la foto más reproducida de Brooklyn.", duration: "2h", cost: 0, tip: "A las 17h para luz dorada. Peatones a la izquierda. En DUMBO baja al waterfront para las vistas del skyline.", mustSee: true },
        { time: "19:30", title: "🛒 Cena supermercado Brooklyn", type: "food", description: "Trader Joe's en 130 Court St o Brooklyn Fare. Come en el waterfront del East River con el skyline iluminado.", duration: "45 min", cost: 7, tip: "El paseo marítimo de Brooklyn de noche con el skyline iluminado: de lo mejor del viaje.", mustSee: false }
      ],
      meals: { breakfast: "✅ Hotel incluido (0€)", lunch: "Katz's Delicatessen (~22€) — experiencia NY", dinner: "🛒 Trader Joe's Brooklyn (~7€)" },
      tips: ["Tour sale de 325 W 49th St — metro A/C/E hasta 50th St", "El puente tiene mucho viento — lleva una capa"],
      estimatedCost: 79
    },
    {
      day: 5,
      date: "2026-04-22",
      title: "Central Park · MOMA · West Village · Chicago 🎭 · Times Square",
      theme: "El día grande — Naturaleza · Arte · Broadway",
      activities: [
        { time: "08:00", title: "☕ Desayuno hotel (incluido)", type: "food", description: "Buffet LIC Plaza. Come bien — el día es largo y espectacular.", duration: "30 min", cost: 0, tip: "Incluido — 0€.", mustSee: false },
        { time: "09:00", title: "🌳 Central Park a pie", type: "free", description: "Entra por Columbus Circle (59th St). Strawberry Fields (John Lennon), The Ramble, Bethesda Fountain, The Lake. 843 acres de verde en el centro de Manhattan.", duration: "2.5h", cost: 0, tip: "Prioriza: Columbus Circle → Strawberry Fields (10 min) → Bethesda Fountain → The Lake. Sin prisa.", mustSee: true },
        { time: "11:30", title: "🎨 MOMA — Museum of Modern Art 🤑", type: "sight", description: "El mejor museo de arte moderno del mundo. La Noche Estrellada de Van Gogh, Picasso, Dalí, Warhol, Frida Kahlo. Todo en 5 pisos. 11 West 53rd St.", duration: "2.5h", cost: 27, tip: "🤑 Confirmar si ya pagado. Reserva online. Empieza en el piso 5 (Van Gogh) y baja. Shake Shack interior con 10% descuento.", mustSee: true },
        { time: "14:30", title: "🍔 Comida — Shake Shack MOMA", type: "food", description: "Shake Shack en el MOMA piso 1: ShackBurger + crinkle fries con 10% descuento mostrando la entrada.", duration: "1h", cost: 12, tip: "Muestra la entrada del MOMA en la caja del Shake Shack. El ShackBurger doble con fries sale ~12$ con descuento.", mustSee: false },
        { time: "16:00", title: "🏘️ Paseo West Village + Sex and the City", type: "free", description: "El barrio más bonito de Manhattan. 66 Perry Street (fachada real del apartamento de Carrie). Magnolia Bakery cupcakes. Calles adoquinadas, casas de ladrillo rojo.", duration: "1.5h", cost: 4, tip: "Cupcake de Magnolia (~4€) merece la cola. El edificio de Perry St tiene cadena — solo foto desde fuera.", mustSee: true },
        { time: "19:00", title: "🎭 Musical CHICAGO — Ambassador Theatre 🤑", type: "activity", description: "219 W 49th St. Ya pagado. Llega 20 min antes. El musical más premiado de Broadway.", duration: "2.5h", cost: 0, tip: "YA PAGADO. 'All That Jazz' en el primer número es electrizante. Cóctel en el bar del teatro en el intermedio.", mustSee: true },
        { time: "21:00", title: "🌃 Times Square de noche", type: "free", description: "El Ambassador está a 2 min de Times Square. De noche las luces de neón son hipnóticas. 20-30 min.", duration: "30 min", cost: 0, tip: "Solo mirar. No comer ni comprar — precios de turista extremos.", mustSee: true }
      ],
      meals: { breakfast: "✅ Hotel incluido (0€)", lunch: "Shake Shack MOMA con -10% (~12€)", dinner: "Pre-musical: snack rápido Hell's Kitchen (~8€) + cupcake Magnolia (~4€)" },
      tips: ["Del MOMA al Ambassador Theatre: 10 min andando por 53rd hasta Broadway y bajar a 49th", "El día más intenso — empieza bien descansado"],
      estimatedCost: 55
    },
    {
      day: 6,
      date: "2026-04-23",
      title: "High Line · Hudson Yards · The Little Island · Check-in Williamsburg",
      theme: "NY verde alternativo · Check-out LIC · Pod Brooklyn",
      activities: [
        { time: "08:00", title: "☕ Último desayuno LIC Plaza (incluido)", type: "food", description: "Último desayuno buffet del LIC Plaza. Check-out y maletas en consigna.", duration: "45 min", cost: 0, tip: "Incluido — 0€. Check-out a las 11h. Deja maletas en consigna del hotel gratis.", mustSee: false },
        { time: "09:00", title: "🌿 High Line + Hudson Yards", type: "free", description: "Parque elevado sobre antigua vía de tren, desde Gansevoort St (14th) hasta 34th St. Arte, jardines, vistas al Hudson. Hudson Yards y The Vessel al final.", duration: "2h", cost: 0, tip: "Entra por la 14th St — el tramo sur es el más bonito. The Vessel en Hudson Yards: reserva gratis online para subir.", mustSee: true },
        { time: "12:00", title: "🏝️ The Little Island", type: "free", description: "Isla artificial futurista inaugurada 2021, flotando sobre el Hudson (Pier 55). 100 árboles, jardines, anfiteatro. Al final de la High Line.", duration: "1h", cost: 0, tip: "Entrada gratuita. Posible reserva en temporada alta. Conciertos gratuitos en el anfiteatro.", mustSee: true },
        { time: "14:30", title: "🍕 Comida — Joe's Pizza Chelsea", type: "food", description: "Joe's Pizza en 7 Carmine St: la pizza por porciones más famosa de NY. Dos porciones + refresco por ~7$. Cerca del West Village.", duration: "45 min", cost: 8, tip: "Pide 'plain slice' — masa fina NY style. Sin cola a las 14:30h. El mejor precio-calidad del viaje.", mustSee: true },
        { time: "15:30", title: "🏨 Check-in Pod Brooklyn — Williamsburg", type: "hotel", description: "247 Metropolitan Ave, Williamsburg. Recoge maletas del LIC Plaza y tráelas en taxi/Lyft (~15$). El rooftop tiene vistas a Manhattan.", duration: "30 min", cost: 0, tip: "Ya pagado. El rooftop del Pod es gratis para huéspedes — sube a tomar algo.", mustSee: false },
        { time: "17:00", title: "🎨 Williamsburg Street Art + Bedford Ave", type: "free", description: "El barrio más cool de Brooklyn. Murales en Wythe Ave y Bedford Ave. Tiendas vintage, cafés de especialidad, librerías. El paseo marítimo con vistas a Manhattan al atardecer.", duration: "2h", cost: 0, tip: "Paseo marítimo (East River State Park) al atardecer con el skyline iluminado: de los mejores momentos del viaje.", mustSee: true },
        { time: "19:30", title: "🛒 Cena supermercado Williamsburg", type: "food", description: "Whole Foods en 238 Bedford Ave. Come en el paseo marítimo del East River con vistas al skyline de Manhattan iluminado.", duration: "45 min", cost: 7, tip: "Esta combinación — cena de super en el waterfront con ese skyline — es imbatible.", mustSee: false }
      ],
      meals: { breakfast: "✅ Hotel LIC incluido — último día (0€)", lunch: "Joe's Pizza Chelsea (~8€)", dinner: "🛒 Whole Foods Williamsburg (~7€)" },
      tips: ["Coge taxi/Lyft para llevar maletas de LIC al Pod (~15$, incluido en coste día)", "El rooftop del Pod: no te lo pierdas aunque no consumas"],
      estimatedCost: 30
    },
    {
      day: 7,
      date: "2026-04-24",
      title: "Williamsburg · Vuelta ✈️ JFK 23:45",
      theme: "Último paseo · Vuelo de regreso",
      activities: [
        { time: "09:00", title: "🎨 Williamsburg Street Art — paseo matutino", type: "free", description: "Williamsburg sin turistas de mañana. East River State Park con luz de la mañana — las mejores fotos del skyline del viaje.", duration: "1.5h", cost: 0, tip: "La luz dorada de las 9-10h sobre Manhattan desde Williamsburg es espectacular. Última oportunidad.", mustSee: true },
        { time: "11:00", title: "☕ Brunch — Café Mogador u otro", type: "food", description: "Pod Brooklyn no incluye desayuno. Café Mogador (133 Wythe Ave): brunch estilo marroquí, muy local. O bagel en cualquier deli del barrio.", duration: "1h", cost: 14, tip: "Mogador es clásico de Williamsburg desde 1983. Los huevos con pan pita y el zumo son el cierre perfecto.", mustSee: false },
        { time: "13:00", title: "🚶 Último paseo libre", type: "free", description: "Tiempo libre: compras de última hora en Bedford Ave, café de especialidad en Devoción (69 Grand St — el mejor de Brooklyn), o simplemente sentarse en el waterfront.", duration: "2h", cost: 5, tip: "Devoción en Grand St: el mejor café con leche de Brooklyn. Granos directos de Colombia.", mustSee: false },
        { time: "15:00", title: "🍕 Comida final — Grimaldi's o Juliana's DUMBO", type: "food", description: "Grimaldi's (1 Front St) o Juliana's Pizza al lado, DUMBO. La mejor pizza de horno de carbón de NY. Vale el trayecto en metro desde Williamsburg.", duration: "1.5h", cost: 15, tip: "A las 15h para evitar colas. En Grimaldi's: mínimo una pizza entera. El sabor del horno de carbón es único en NY.", mustSee: true },
        { time: "18:30", title: "🚇 Williamsburg → JFK", type: "transport", description: "Metro J/M/Z desde Marcy Ave hasta Jamaica Station, luego AirTrain a JFK Terminal 1. Total ~1h.", duration: "1h", cost: 9, tip: "Sal a las 18:30 como muy tarde. Control internacional JFK: 45-60 min. Llega al aeropuerto a las 20:30.", mustSee: false },
        { time: "20:30", title: "✅ Check-in + seguridad JFK Terminal 1", type: "transport", description: "Facturación LEVEL, control de seguridad, gate. Cena en el aeropuerto.", duration: "3h", cost: 10, tip: "Cena en el aeropuerto (~10€). Aterriza en BCN el 25 abril a las 14:00h.", mustSee: false },
        { time: "23:45", title: "✈️ Vuelo JFK → BCN — LEVEL", type: "transport", description: "Despegue. Aterriza en Barcelona el 25 de abril a las 14:00h.", duration: "8h vuelo", cost: 0, tip: "¡Nueva York ya es tuya para siempre! Guarda un ticket de metro como recuerdo.", mustSee: false }
      ],
      meals: { breakfast: "❌ Pod Brooklyn sin desayuno — Café Mogador brunch (~14€)", lunch: "Grimaldi's DUMBO (~15€)", dinner: "Aeropuerto JFK (~10€)" },
      tips: ["Sale de Williamsburg a las 18:30 máximo para JFK", "Último día: más lento, disfruta lo conocido"],
      estimatedCost: 63
    }
  ],
  generalTips: [
    "🚇 Metro OMNY: toca directamente con tu tarjeta española o Apple Pay en el torniquete — sin MetroCard. ~2.90$/viaje. Bono 7 días (~34$) solo si haces más de 12 trayectos.",
    "💰 Propinas: 18-20% en restaurantes con servicio en mesa. En mostrador/food truck: opcional. En taxi/Uber: 15%.",
    "🛒 Estrategia supermercados: Whole Foods = mejor calidad. Trader Joe's = mejor precio. Come en parques o waterfronts — experiencia 100% NY.",
    "🤑 Marcados como ya pagados (sin restar del presupuesto libre): vuelos, hoteles, Summit One Vanderbilt, Tour Contrastes, MOMA, Musical Chicago. Verificar cuáles están confirmados.",
    "🌡️ Abril: 10-18°C de día, 5-10°C noche. Capas imprescindibles. Posible lluvia — paraguas compacto en la mochila.",
    "📱 Datos: activa roaming de tu operador (~15€/semana) o SIM prepago T-Mobile en JFK (~30$ para 10GB). Fundamental para mapas y OMNY."
  ],
  emergencyInfo: "Emergencias: 911. Embajada española: 150 E 58th St — +1 (212) 355-4080. Farmacia 24h: Duane Reade (en toda la ciudad). Hospital LIC: NYC Health+Hospitals Elmhurst, 79-01 Broadway, Queens.",
  generatedAt: new Date().toISOString(),
  model: "Itinerario personalizado FileHub"
};

// ─────────────────────────────────────────────
// RESUMEN ECONÓMICO DETALLADO
// ─────────────────────────────────────────────
// DÍA 1 (Llegada):        8€   Metro JFK
// DÍA 2 (Midtown):       51€   Summit 35€ + comida 9€ + cena 7€
// DÍA 3 (Lower Mnh):     19€   Chinatown 10€ + Roosevelt 3€ + cena 6€
// DÍA 4 (Contrastes):    79€   Tour 50€ + Katz's 22€ + cena 7€
// DÍA 5 (MOMA+Chicago):  55€   MOMA 27€ + Shake Shack 12€ + West Village 4€ + pre-cena 12€
// DÍA 6 (High Line):     30€   Joe's Pizza 8€ + taxi maletas 15€ + cena 7€
// DÍA 7 (Vuelta):        63€   Brunch 14€ + café 5€ + Grimaldi's 15€ + metro JFK 9€ + aeropuerto 10€
// ─────────────────────────────────────────────
// TOTAL ESTIMADO:       305€
// Si Summit ya pagado:  270€
// Si Tour ya pagado:    255€
// Si MOMA ya pagado:    228€ ← dentro del presupuesto 230€
// Si los 3 pagados:     193€ ← muy holgado
// ─────────────────────────────────────────────
// DESGLOSE POR TIPO:
// Desayunos: 0€  (incluidos días 1-6) + 14€ día 7 = 14€
// Almuerzos: 98€ (Halal 9 + Chinatown 10 + Katz's 22 + Shake Shack 12 + Joe's 8 + Grimaldi's 15 + aerop 10 + café 5 + snack llegada 5 + cupcake 4)
// Cenas:     40€ (supermercado ~7€ × 5 noches + pre-musical 8€ + snack JFK/noche llegada 5€)
// Transport: 26€ (metro JFK ×2 = 17€ + taxi maletas 15€ + algunos metros)
// Activ:    127€ (Summit 35€ + Roosevelt 3€ + Tour 50€ + MOMA 27€ + West Village 4€ + Devoción 5€)
// ─────────────────────────────────────────────

export const NY_PLAN_PRESET = {
  id: `ny_trip_preset`,
  destination: "Nueva York, EEUU",
  origin: "Barcelona, España",
  startDate: "2026-04-18",
  endDate: "2026-04-24",
  travelers: 1,
  budget: 230,
  currency: "EUR",
  style: "mochilero" as const,
  interests: ["🍽️ Gastronomía", "🏛️ Cultura e historia", "🎭 Arte y museos", "📸 Fotografía", "🌿 Naturaleza"],
  notes: "LIC Plaza Hotel días 1-6 con desayuno incluido. Pod Brooklyn día 7 sin desayuno. Musical Chicago 22 Abr 19h — YA PAGADO. Vuelo LEVEL BCN 17:35 → JFK 22:00 y JFK 23:45 → BCN. 🤑 Verificar cuáles están prepagados: Summit, Tour Contrastes, MOMA.",
  mustVisitPlaces: "",
  itinerary: NY_ITINERARY_PRESET,
  favorite: true,
  createdAt: new Date().toISOString()
};
