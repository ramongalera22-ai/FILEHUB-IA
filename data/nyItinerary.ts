/**
 * Itinerario Nueva York - Carlos - Abril 2026
 * Generado con todos los sitios del mapa + presentación PPTX
 * Ritmo tranquilo, presupuesto 230€ (solo comida + actividades)
 */

export const NY_ITINERARY_PRESET = {
  destination: "Nueva York, EEUU",
  summary: "6 noches en la Gran Manzana con base en LIC Plaza (Queens) y última noche en Williamsburg. Ritmo tranquilo priorizando gratuitos, con el musical Chicago como plato fuerte. Incluye los mejores barrios de Manhattan, Brooklyn y Queens sin agobios.",
  totalDays: 7,
  estimatedTotal: 228,
  currency: "EUR",
  bestTimeToVisit: "Primavera (marzo-mayo) — clima agradable, sin el calor húmedo del verano",
  language: "Inglés",
  currency_info: "Moneda USD. Tarjeta de crédito aceptada en casi todo. Ten 20-30$ en efectivo para propinas y mercados. Metro: tarjeta OMNY (contactless) funciona directamente con tu tarjeta europea.",
  days: [
    {
      day: 1,
      date: "2026-04-18",
      title: "Llegada — Bienvenido a Nueva York",
      theme: "Aterrizaje y check-in",
      activities: [
        { time: "22:00", title: "Aterrizaje JFK Terminal 1", type: "transport", description: "Vuelo LEVEL desde BCN. Pasa aduanas e inmigración — ten documentación a mano.", duration: "1h trámites", cost: 0, tip: "La cola de inmigración puede ser larga (30-60 min). Mantén la calma.", mustSee: false },
        { time: "23:00", title: "Metro AirTrain + E/J al Hotel LIC", type: "transport", description: "AirTrain hasta Jamaica Station (~$8.50), luego metro E o J hasta Queens Plaza. El LIC Plaza está a 2 min andando.", duration: "45 min", cost: 10, tip: "Carga la tarjeta OMNY en el aeropuerto — funciona con contactless de tu tarjeta española.", mustSee: false },
        { time: "00:00", title: "Check-in LIC Plaza Hotel", type: "hotel", description: "Tu base los próximos 5 días. Queens — tranquilo, bien conectado, desayuno incluido.", duration: "", cost: 0, tip: "Pide habitación con vista al skyline si es posible — es impresionante.", mustSee: false },
        { time: "00:15", title: "Primera ojeada a Gantry Plaza", type: "free", description: "Si hay energía, baja 3 min al parque frente al hotel. Las vistas del skyline de noche son espectaculares. Totalmente gratis.", duration: "20 min", cost: 0, tip: "El parque está a 3 minutos del hotel caminando. Ideal para primera foto de NY.", mustSee: true }
      ],
      meals: { breakfast: "En el avión", lunch: "En el avión", dinner: "En el avión / algo rápido en el aeropuerto" },
      tips: ["Guarda la energía — mañana el itinerario empieza fuerte", "El jet lag es real: intenta aguantar hasta las 11pm hora local"],
      estimatedCost: 10
    },
    {
      day: 2,
      date: "2026-04-19",
      title: "Midtown — El Corazón de Manhattan",
      theme: "Grand Central · 5ª Avenida · Top of the Rock",
      activities: [
        { time: "08:30", title: "Desayuno en el hotel (incluido)", type: "food", description: "Aprovecha el desayuno incluido en el LIC Plaza.", duration: "30 min", cost: 0, tip: "", mustSee: false },
        { time: "09:30", title: "Grand Central Terminal", type: "sight", description: "Una de las estaciones más bellas del mundo. Sube a la galería Whispering Gallery. No te pierdas el techo constelado. La sala del mercado de comida en el sótano es perfecta para curiosear.", duration: "1h", cost: 0, tip: "Busca el punto donde susurras en la esquina y se oye al otro lado. Gratis y mágico.", mustSee: true },
        { time: "11:00", title: "5ª Avenida + St. Patrick's Cathedral", type: "sight", description: "La catedral gótica más impresionante de Manhattan. Entrada gratuita. Después, paseo por la 5ª Avenida — Rockefeller Center, tiendas de lujo, el ambiente más emblemático de NY.", duration: "1.5h", cost: 0, tip: "Entra a la catedral — el contraste con los rascacielos es único. Respeta el silencio.", mustSee: true },
        { time: "13:00", title: "Almuerzo Halal Cart — 6th Ave", type: "food", description: "El Halal Cart más famoso de NY, frente al Rockefeller Center. Arroz + pollo + salsa blanca y roja. La mejor relación calidad-precio de Midtown.", duration: "45 min", cost: 6, tip: "Pide 'chicken over rice, white sauce AND hot sauce'. Cola de 10 min habitual.", mustSee: true },
        { time: "14:30", title: "Bergdorf Goodman (entrar a curiosear)", type: "shopping", description: "Los famosos grandes almacenes de lujo de Carrie Bradshaw. No hace falta comprar — el escaparate y los escaparates interiores son una experiencia visual.", duration: "30 min", cost: 0, tip: "Piso 7 tiene la mejor vista de Central Park totalmente gratis.", mustSee: false },
        { time: "15:30", title: "Top of the Rock — Rockefeller Center", type: "sight", description: "Las mejores vistas de Manhattan, con Central Park al norte y el skyline completo al sur. Abierto hasta las 12 de la noche. Mejor que el Empire State (vistas incluyen el Empire State).", duration: "1.5h", cost: 38, tip: "Ve a última hora de la tarde para ver el atardecer sobre Manhattan. Es espectacular.", mustSee: true },
        { time: "20:00", title: "Cena Chelsea Market", type: "food", description: "Mercado gastronómico en una antigua fábrica de galletas. Ambiente increíble. Prueba Los Tacos No. 1, Takumi Taco o Mokbar (ramen).", duration: "1.5h", cost: 12, tip: "El mercado está justo en el barrio de Meatpacking — perfecto para ver el ambiente nocturno.", mustSee: true }
      ],
      meals: { breakfast: "Hotel (incluido)", lunch: "Halal Cart 6th Ave (~6€)", dinner: "Chelsea Market (~12€)" },
      tips: ["Metro desde LIC Plaza: línea 7 hasta Grand Central en 15 min directo", "El Top of the Rock conviene reservar online con antelación (especialmente en temporada alta)"],
      estimatedCost: 56
    },
    {
      day: 3,
      date: "2026-04-20",
      title: "Lower Manhattan — Historia y Alma de NY",
      theme: "Wall St · 11S · Chinatown · Roosevelt Island",
      activities: [
        { time: "08:30", title: "Desayuno hotel (incluido)", type: "food", description: "", duration: "30 min", cost: 0, tip: "", mustSee: false },
        { time: "09:30", title: "Toro de Wall Street + Bowling Green", type: "sight", description: "El famoso toro de bronce símbolo del capitalismo americano. Por la mañana temprano casi no hay cola para la foto. Bowling Green, el primer parque público de NY.", duration: "30 min", cost: 0, tip: "A las 9:30 hay muy poca gente. A las 11 es una locura.", mustSee: true },
        { time: "10:00", title: "Memorial 9/11 + Museum Plaza", type: "sight", description: "Las dos piscinas en el lugar exacto de las Torres Gemelas. Emocionante y muy bien cuidado. El museo exterior es gratuito; si entras al museo son ~33$, pero la plaza es muy impactante de por sí.", duration: "1h", cost: 0, tip: "El museo es opcional (caro). La plaza y los nombres en las piscinas son gratuitos y muy emotivos.", mustSee: true },
        { time: "11:00", title: "Oculus + Cortlandt St Station", type: "sight", description: "La estación de metro más fotogénica del mundo. Arquitectura de Santiago Calatrava — parece un dinosaurio de mármol blanco. Completamente gratis. Instagram obligatorio.", duration: "30 min", cost: 0, tip: "Sube a la galería interior. La foto desde dentro mirando al cielo es única.", mustSee: true },
        { time: "11:45", title: "Trinity Church + Battery Park", type: "sight", description: "Iglesia gótica con los muertos más famosos de la historia americana (Alexander Hamilton). Battery Park: vistas a la Estatua de la Libertad sin pagar el ferry.", duration: "45 min", cost: 0, tip: "Desde Battery Park puedes ver la Estatua de la Libertad. El ferry vale ~24€ — tú decides si merece la pena.", mustSee: false },
        { time: "12:30", title: "Almuerzo Chinatown — Mott St", type: "food", description: "El Chinatown de Manhattan es el más auténtico de EEUU. Busca Joe's Shanghai (sopa de dumpling XLB, ~9€) o los puestos de la calle para dim sum baratísimo.", duration: "1h", cost: 9, tip: "Sal de las calles principales. Las mejores tiendas y comida están en las callejuelas.", mustSee: true },
        { time: "16:00", title: "Teleférico de Roosevelt Island", type: "activity", description: "El teleférico más barato y espectacular de NY. Sale de la 2ª Avenida esquina 59th Street. Vistas aéreas del East River y el skyline. Solo cuesta el precio del metro (~2.75$).", duration: "30 min ida y vuelta", cost: 3, tip: "Funciona con la tarjeta OMNY como el metro. Baja en la isla y sube al mirador FDR.", mustSee: true },
        { time: "17:00", title: "East Village a pie", type: "free", description: "Uno de los barrios más cool de Manhattan. St. Marks Place, Tompkins Square Park, tiendas vintage, murales callejeros. El NY bohemio y auténtico.", duration: "1.5h", cost: 0, tip: "Busca la tienda de vinillos 'Sounds' y el mural de David Bowie en Lafayette St.", mustSee: false },
        { time: "20:00", title: "Cena Ramen East Village", type: "food", description: "Ippudo NY (421 Lafayette St) o Momofuku Noodle Bar. El mejor ramen fuera de Japón. Cola habitual de 20-30 min — llega antes de las 7pm.", duration: "1.5h", cost: 12, tip: "Ippudo tiene listas de espera online. La barra del chef en Momofuku es experiencia única.", mustSee: true }
      ],
      meals: { breakfast: "Hotel (incluido)", lunch: "Chinatown Mott St (~9€)", dinner: "Ramen East Village (~12€)" },
      tips: ["Todo el recorrido del día se puede hacer andando o con el metro", "El Oculus es más impresionante con luz de día — ve antes del mediodía"],
      estimatedCost: 24
    },
    {
      day: 4,
      date: "2026-04-21",
      title: "Tour de Contrastes + Brooklyn",
      theme: "Bronx · Harlem · Queens · Brooklyn · DUMBO",
      activities: [
        { time: "08:30", title: "Desayuno hotel (incluido)", type: "food", description: "", duration: "30 min", cost: 0, tip: "", mustSee: false },
        { time: "09:00", title: "Tour de Contrastes VIP — 5 horas", type: "activity", description: "El tour más interesante de NY. En autobús pequeño recorriendo los barrios reales: Bronx (South Bronx, origen del hip-hop), East Harlem, Queens, Brooklyn. Guía local que cuenta la historia desde dentro. Termina en Chinatown.", duration: "5h", cost: 55, tip: "Este tour cambia la perspectiva de NY completamente. Nada de turismo de postal. Reserva online en NY Tours Inc o Urban Oyster.", mustSee: true },
        { time: "14:30", title: "Almuerzo Chinatown (final del tour)", type: "food", description: "El tour termina en Chinatown. Aprovecha para comer de nuevo — o prueba algo que no probaste ayer. Los dumplings de Vanessa's Dumpling House son míticos (8 dumplings por 3$).", duration: "1h", cost: 10, tip: "Vanessa's Dumpling House en 118 Eldridge St: los mejores dumplings fritos de la ciudad.", mustSee: false },
        { time: "16:00", title: "Puente de Brooklyn + DUMBO", type: "sight", description: "Cruzar el Puente de Brooklyn a pie es una experiencia única (40 min de un lado al otro). DUMBO (Down Under the Manhattan Bridge Overpass) es el barrio más fotogénico de Brooklyn.", duration: "2h", cost: 0, tip: "La foto clásica: Washington St mirando al puente de Manhattan. Ve a las 5pm para luz dorada.", mustSee: true },
        { time: "19:30", title: "Cena Juliana's Pizza — DUMBO", type: "food", description: "Una de las pizzas más famosas de NYC. Juliana's Pizza debajo del puente de Brooklyn. Pizza de masa fina estilo NY, horno de carbón. Reserva o espera en cola.", duration: "1.5h", cost: 12, tip: "Si hay mucha cola en Juliana's, Grimaldi's al lado es igual de bueno. Precio similar.", mustSee: true },
        { time: "21:00", title: "Vuelta al hotel — skyline desde el East River", type: "free", description: "Pasea por el Brooklyn waterfront de noche antes de volver. Las vistas del skyline iluminado desde Brooklyn son las mejores de NYC.", duration: "30 min", cost: 0, tip: "Metro: línea A/C desde Jay St hasta Queens y enlace a línea 7.", mustSee: false }
      ],
      meals: { breakfast: "Hotel (incluido)", lunch: "Chinatown dumplings (~10€)", dinner: "Juliana's Pizza DUMBO (~12€)" },
      tips: ["El tour es el punto fuerte del día — no llegues tarde a las 9h", "El puente de Brooklyn tiene carril para bici y peatones — ve por el de peatones (lado izquierdo)"],
      estimatedCost: 87
    },
    {
      day: 5,
      date: "2026-04-22",
      title: "Central Park · MOMA · ¡CHICAGO en Broadway! 🎭",
      theme: "Arte · Naturaleza · El Musical",
      activities: [
        { time: "08:30", title: "Desayuno hotel (incluido)", type: "food", description: "", duration: "30 min", cost: 0, tip: "", mustSee: false },
        { time: "09:00", title: "Central Park a pie", type: "free", description: "843 acres de pulmón verde en el corazón de Manhattan. Entra por Columbus Circle (59th St). Strawberry Fields (homenaje a John Lennon), Bethesda Fountain, el lago con barcas, el Bandshell.", duration: "2.5h", cost: 0, tip: "Alquila una barca en The Lake (~$15/h) si hay ganas. Los jardines japoneses son poco conocidos y preciosos.", mustSee: true },
        { time: "11:30", title: "MOMA — Museum of Modern Art", type: "sight", description: "Van Gogh, Dalí, Warhol, Picasso, Mondrian, Frida Kahlo... El mejor museo de arte moderno del mundo. La Noche Estrellada de Van Gogh es la estrella. Reserva con antelación.", duration: "2.5h", cost: 27, tip: "Con la reserva del MOMA, Shake Shack en la planta 1 tiene 10% de descuento. No te pierdas la azotea en verano.", mustSee: true },
        { time: "14:30", title: "Shake Shack (con descuento MOMA 10%)", type: "food", description: "La hamburguesería más famosa de NY, nacida en Madison Square Park. Con el descuento del MOMA sale perfecto. ShackBurger + crinkle fries + milkshake de vainilla.", duration: "1h", cost: 12, tip: "Pide el ShackBurger doble — vale la pena el extra.", mustSee: false },
        { time: "16:00", title: "Paseo West Village + Sex and the City", type: "free", description: "El barrio más bonito de Manhattan. 66 Perry Street (el edificio real donde vive Carrie Bradshaw), Magnolia Bakery (401 Bleecker St, cupcakes de la serie), tiendas boutique, cafés tranquilos.", duration: "1.5h", cost: 4, tip: "El cupcake de Magnolia (~4€) merece la cola. También en Columbus Ave si hay mucha gente.", mustSee: false },
        { time: "18:00", title: "Cena rápida antes del musical", type: "food", description: "Bar o restaurante cerca del Ambassador Theatre (49th St y Broadway). Marseille (630 9th Ave) es perfecto: cocina francesa casual, precios razonables, a 5 min del teatro.", duration: "1h", cost: 15, tip: "Come antes de las 18:30 para llegar cómodo al teatro.", mustSee: false },
        { time: "19:00", title: "🎭 MUSICAL CHICAGO — Ambassador Theatre", type: "activity", description: "El musical más premiado de Broadway. Ya pagado. Ambassador Theatre: 219 West 49th Street. Llega 20 min antes para buscar tu asiento y ver el ambiente.", duration: "2.5h", cost: 0, tip: "YA PAGADO. Prohibido perdérselo. El número de apertura 'All That Jazz' es electrizante.", mustSee: true }
      ],
      meals: { breakfast: "Hotel (incluido)", lunch: "Shake Shack MOMA (~12€)", dinner: "Marseille o similar (~15€)" },
      tips: ["El día más caro pero más completo", "El MOMA conviene reservar con antelación online — evitas cola"],
      estimatedCost: 58
    },
    {
      day: 6,
      date: "2026-04-23",
      title: "High Line · Museos Ocultos · Brooklyn (última noche)",
      theme: "NY alternativo y desconocido · Check-in Pod Brooklyn",
      activities: [
        { time: "08:30", title: "Desayuno hotel LIC (último día — incluido)", type: "food", description: "Último desayuno en el LIC Plaza. Check-out y guarda las maletas.", duration: "45 min", cost: 0, tip: "Deja las maletas en recepción — check-out a las 12h, check-in Pod Brooklyn a las 15h.", mustSee: false },
        { time: "09:30", title: "The High Line", type: "free", description: "Parque lineal elevado sobre una antigua vía de tren en el West Side. Jardines, arte callejero, vistas espectaculares al Hudson. Entra por 14th St. Hudson Yards al final.", duration: "1.5h", cost: 0, tip: "El tramo entre 14th y 20th St es el más bonito. Los domingos hay mercado de artesanía.", mustSee: true },
        { time: "11:00", title: "The Little Island", type: "free", description: "Isla artificial inaugurada en 2021 flotando sobre el Hudson River. Diseño futurista con 100 árboles y plantas. Conciertos gratuitos en temporada. Perspectivas únicas del skyline.", duration: "45 min", cost: 0, tip: "Justo al final de la High Line en el Pier 55. El anfiteatro tiene eventos gratuitos.", mustSee: true },
        { time: "12:00", title: "NY Transit Museum — Brooklyn", type: "sight", description: "Museo en una estación de metro abandonada de 1936. Vagones desde 1908 que puedes entrar. El secreto mejor guardado de NYC — casi sin turistas, completamente auténtico.", duration: "1.5h", cost: 10, tip: "Está en Boerum Place & Schermerhorn St, Brooklyn. El metro G o 2/3 llega directo.", mustSee: true },
        { time: "14:00", title: "Almuerzo DUMBO — Time Out Market", type: "food", description: "El Time Out Market Brooklyn en DUMBO reúne los mejores restaurantes de la ciudad. Vista al puente desde las ventanas. Pasta, pizza, tacos, sushi — elige lo que quieras.", duration: "1h", cost: 12, tip: "También puedes ir directamente a Grimaldi's Pizza o probar Vinegar Hill House si quieres sentarte.", mustSee: false },
        { time: "15:30", title: "Check-in Pod Brooklyn — Williamsburg", type: "hotel", description: "Tu última noche. Pod Brooklyn en Williamsburg — moderno, social, buen ambiente. Deja las maletas y explora el barrio.", duration: "30 min", cost: 0, tip: "El rooftop del Pod tiene vistas increíbles. Sube a tomar algo aunque no consumas.", mustSee: false },
        { time: "16:00", title: "MoMA PS1 — Gratis en 2026", type: "sight", description: "La sucursal vanguardista del MOMA en Long Island City (Queens). Arte contemporáneo radical. Completamente gratis en 2026. En verano hay conciertos WarmUp los sábados.", duration: "1.5h", cost: 0, tip: "A 10 min en metro desde Williamsburg. Arte que no encontrarás en ningún museo convencional.", mustSee: false },
        { time: "18:00", title: "Williamsburg Street Art + Bedford Ave", type: "free", description: "El barrio más cool de Brooklyn. Murales de arte callejero por todas partes. Bedford Avenue es la calle principal: tiendas vintage, cafés, restaurantes, vida local auténtica.", duration: "2h", cost: 0, tip: "Busca el mural de Jean-Michel Basquiat en Bedford Ave. El barrio es muy diferente de Manhattan.", mustSee: true },
        { time: "20:00", title: "Cena Williamsburg — Tu elección", type: "food", description: "Zona perfecta para última cena. Lilia (pasta italiana premium, ~30€), Marlow & Sons (casual, local, ~20€), o cualquier restaurante de Bedford Ave.", duration: "1.5h", cost: 20, tip: "Lilia es el mejor restaurante de Williamsburg pero conviene reservar. Alternativa: Peter Luger Steak House si te permite el presupuesto.", mustSee: false }
      ],
      meals: { breakfast: "Hotel LIC (incluido)", lunch: "DUMBO Time Out Market (~12€)", dinner: "Williamsburg (~20€)" },
      tips: ["El Transit Museum es el secreto mejor guardado de NYC", "Williamsburg por la noche tiene el mejor ambiente joven de todo Brooklyn"],
      estimatedCost: 42
    },
    {
      day: 7,
      date: "2026-04-24",
      title: "Williamsburg · Regreso — Buen viaje ✈️",
      theme: "Último paseo · Vuelo 23:45",
      activities: [
        { time: "09:00", title: "Street Art matutino Williamsburg", type: "free", description: "Williamsburg sin turistas por la mañana. Los mejores murales están en: Bedford Ave entre N7 y N10, Wythe Ave, y el paseo marítimo del East River.", duration: "1.5h", cost: 0, tip: "El paseo marítimo de Williamsburg tiene las mejores vistas de Manhattan — mejor que Brooklyn Bridge Park.", mustSee: true },
        { time: "10:30", title: "Smorgasburg (si es domingo) / Cafe Regular", type: "food", description: "Si es domingo: Smorgasburg en Marsha P. Johnson Park — el mercado de street food más grande de NYC, 100 puestos de cocina del mundo. Si es otro día: Cafe Regular (muy local, café de especialidad perfecto).", duration: "1h", cost: 8, tip: "Smorgasburg solo domingos de 11h-18h. El arroz con pollo del puesto Jamaican es legendario.", mustSee: true },
        { time: "12:30", title: "Tenement Museum — Lower East Side", type: "sight", description: "Apartamentos reales de inmigrantes de 1863 conservados tal cual. Visita guiada con historias emotivas y reales de familias que llegaron sin nada. De los museos más únicos del mundo.", duration: "2h", cost: 27, tip: "Reserva OBLIGATORIA online — las visitas son grupales y se agotan. El tour 'Hard Times' es el más emotivo.", mustSee: true },
        { time: "15:00", title: "Bagel Russ & Daughters — Lower East Side", type: "food", description: "La deli más legendaria de NYC desde 1914. El bagel definitivo: Nova lox + cream cheese + cebolla. La versión original, sin modernidades.", duration: "45 min", cost: 8, tip: "También en el Russ & Daughters Cafe (más cerca, más espacio). Un clásico absoluto de NY.", mustSee: true },
        { time: "16:00", title: "Paseo final por el Elevated Acre", type: "free", description: "Jardín secreto elevado sobre un edificio en el Financial District (55 Water St). Un oasis urbano que la mayoría de neoyorquinos no sabe que existe. Vistas al East River.", duration: "30 min", cost: 0, tip: "Entra por la galería del 55 Water St. Sube al ascensor hasta el nivel 2. Completamente gratis.", mustSee: false },
        { time: "17:30", title: "Maletas y hacia el aeropuerto JFK", type: "transport", description: "Recoge maletas del Pod Brooklyn. Metro hasta JFK: línea J o M hasta Jamaica, luego AirTrain. Tiempo total: 45-60 min.", duration: "1h", cost: 10, tip: "Sal como tarde a las 18:30. El control de seguridad internacional puede tardar 45 min.", mustSee: false },
        { time: "20:00", title: "Check-in JFK — Terminal 1 LEVEL", type: "transport", description: "Llega 3h antes del vuelo (las 20:45). Factura el equipaje, pasa seguridad, explore el terminal.", duration: "3h", cost: 0, tip: "Cena en el aeropuerto — hay opciones decentes en la terminal y así llegas tranquilo.", mustSee: false },
        { time: "23:45", title: "✈️ Vuelo JFK → BCN — LEVEL", type: "transport", description: "Vuelo de regreso. Intenta dormir — aterrizas en Barcelona a las 14:00h del 25 de abril.", duration: "8h vuelo", cost: 0, tip: "¡Nueva York ya forma parte de ti! Guarda los tickets de metro como recuerdo.", mustSee: false }
      ],
      meals: { breakfast: "Café en Williamsburg (~4€)", lunch: "Smorgasburg o Cafe Regular (~8€)", dinner: "Bagel Russ & Daughters (~8€) + aeropuerto" },
      tips: ["El Tenement Museum es de los mejores museos de todo NY — no lo saltes", "Llega al aeropuerto con tiempo — el control internacional JFK puede ser lento"],
      estimatedCost: 53
    }
  ],
  generalTips: [
    "🚇 Metro: tarjeta OMNY (contactless) con tu tarjeta española. Single ride ~2.75$. El día pass (~34$) solo vale si haces 4+ trayectos diarios.",
    "💰 Propinas: 18-20% en restaurantes con servicio en mesa. En mostrador no es obligatorio. En taxi/Uber: 15%.",
    "🌮 Comida barata: Halal Carts, Chinatown, dumplings, pizza por porciones ($2-3), bagels. Puedes comer bien por 8-10€/día.",
    "📱 Datos: activa roaming europeo o cómprate una SIM americana de prepago en el aeropuerto (T-Mobile ~30$). El WiFi del hotel funciona bien para planificar.",
    "🏃 Walking: NY es perfectamente caminable entre barrios cercanos. Google Maps en modo walking funciona perfecto incluso sin datos.",
    "⚡ Enchufes: llevar adaptador tipo A/B (clavija americana plana). La mayoría de hoteles tienen USB en las habitaciones."
  ],
  emergencyInfo: "Emergencias: 911 (policía/médico/fuego). Embajada española en NY: 150 E 58th St, piso 4 — +1 (212) 355-4080. Hospital más cercano a LIC: NYC Health+Hospitals Elmhurst (Queens). Farmacia 24h: Duane Reade en toda la ciudad.",
  generatedAt: new Date().toISOString(),
  model: "Itinerario personalizado FileHub"
};

export const NY_PLAN_PRESET = {
  id: `ny_trip_${Date.now()}`,
  destination: "Nueva York, EEUU",
  origin: "Barcelona, España",
  startDate: "2026-04-18",
  endDate: "2026-04-24",
  travelers: 1,
  budget: 230,
  currency: "EUR",
  style: "mochilero" as const,
  interests: ["🍽️ Gastronomía", "🏛️ Cultura e historia", "🎭 Arte y museos", "📸 Fotografía", "🛍️ Compras"],
  notes: "Hotel LIC Plaza (Queens) noches 1-5 con desayuno incluido. Pod Brooklyn última noche. Musical Chicago 22 Mar 19h Ambassador Theatre ya pagado. Vuelo LEVEL BCN-JFK-BCN.",
  mustVisitPlaces: "",
  itinerary: NY_ITINERARY_PRESET,
  favorite: false,
  createdAt: new Date().toISOString(),
};
