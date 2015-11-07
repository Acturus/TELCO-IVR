$(function(){

	/* 
	   Plugins y APIs de JS utilizados:
	   - DTMF Generator (para el efecto de sonido del dialpad)
	   - Jquery 2 (manejo de eventos y JSON)
	   - Speech API (compatible con Firefox, Opera y Chrome)
	   
	    NOTA: Para habilitar la speech API en Firefox se debe ingresar en nueva pestaña a "about:config"
	   		luego buscar el flag "media.webspeech.synth.enabled" cambiarlo a TRUE o ENABLED y reiniciar firefox
    */

    /* 1) Se definen algunas variables globales */
    var hoy = new Date(); //fecha de hoy, para la verificación de vencimientos
	var utterance; // variable global a usarse con la speech API
	var info; // variable dinámica de los montos y vencimientos de cada numero


	/* 2) Implementacion de la speech API */

	function speakIt(msj, end) { /* Se define la función speakIt() a usarse a lo largo de todo el flujo del IVR */
		end = end || false;
		utterance = new SpeechSynthesisUtterance(msj); // se crea un nuevo objeto Speech Synthesis
		utterance.lang = 'es-ES'; // Lenguaje y Acento de la voz (español)
		window.speechSynthesis.speak(utterance);

		if(end){ // Evento a ejecutarse después del ultimo mensaje (FIN en el flujo) al final de la llamada
			utterance.addEventListener('end', function() {
			    $("#number").empty();
				$("button").removeAttr('disabled');
				$("#toggle-call").html('<i class="icon-phone"></i> CALL').toggleClass('end call');
				$(".beginDial").attr('disabled', true);
				info = undefined;
			});
		}
	}

	/* 3) Inicio del flujo (brevisimo tono de espera y mensaje de bienvenida) */

	tune.onended = function(){
		$("button").removeAttr('disabled'); // se habilita los numeros dialpad
		speakIt('Bienvenido a TELCO, por favor ingrese los 10 dígitos del celular a consultar');
	}

	/* 4) Funciones de borrado de digitos */

		/* 
			Funciones para poder corregir el número marcado 
			se han asignado al boton <x] en el dialpad y a la tecla backspace
	 	*/

	$("#del").click(function(event) {
		$("#number b").last().remove();
	});

	$(document).on("keydown", function (e) {
	    if (e.which === 8 && !$(e.target).is("input, textarea")) {
	        e.preventDefault();
	    }
	});

	$(document).keyup(function(e){
		if(e.keyCode == 8){
			$("#number b").last().remove();
		}
	});


	/* 5) Final o Inicio de llamada */

		/* Funciones asignadas al boton CALL o END que manejar el inicio y cierre de la llamada */

	$("#toggle-call").click(function(event) {

		$("#number").empty();
		info = undefined;

		if($(this).hasClass('call')){

			$("button").attr('disabled', true);
			$("#toggle-call").html('<i class="icon-phone-hang-up"></i> END');

			tune.play();

			tune.onended = function(){
				$("button").removeAttr('disabled');
				speakIt('Bienvenido a TELCO, por favor ingrese los 10 dígitos del celular a consultar');
			}
		}
		else if($(this).hasClass('end')){
			window.speechSynthesis.cancel();
			$("button").removeAttr('disabled');
			$(".beginDial").attr('disabled', true);
			$("#toggle-call").html('<i class="icon-phone"></i> CALL');	
		}

		$("#toggle-call").toggleClass('end call');
	});


	/* 6) Flujo de marcado */

	$(".beginDial").click(function(event) {

		/* 6.a Funciones para el display de los números y simbolos */

		if($(this).is("#asterisk")){
			$("#number").append('<b class="icon-asterisk"></b>').get(0);
		}
		else if($(this).is("#michi")){
			$("#number").append('<b class="icon-michi"></b>').get(0);
		}
		else{
			$("#number").append('<b>'+$(this).text()+'</b>').get(0);
		}

		/* 6.b Inmediatamente se marquen 10 digitos se el sistema validará el número ingreso con el JSON */

		if($("#number b").length == 10 && typeof info === 'undefined'){

			$("button").attr('disabled', true);
			tune.play(); //breve tono de espera

			var numero = $("#number").text(); // se define la variable número que son los digitos marcados

			if(numero in data){ /* Mediante el operador 'in' se verifica la existencia de un indice en el JSON osea si nuestra variable numero se encuentra en el JSON */

				info = data[numero]; // Despues de verificar el número se asignan los datos de montos y vencimientos del número actual a la variable dinámica info 

				tune.onended = function(){ //breve tono de espera

					$("button").removeAttr('disabled');

					/* Mediante la speech api se explica el menú de opciones */

					speakIt('Marque uno para consultar sus minutos de voz, marque 2 para consultar sus mensajes de texto, marque 3 para consultar su paquete de datos, marque 4 para consultar su saldo actual, para repetir opciones marque asterisco');
					
					/* ADICIONAL : marcar asterisco para repetir las opciones */
					$("#asterisk").click(function(event) {
						window.speechSynthesis.cancel();
						setTimeout(function(){
							speakIt('Marque uno para consultar sus minutos de voz, marque 2 para consultar sus mensajes de texto, marque 3 para consultar su paquete de datos, marque 4 para consultar su saldo actual, para repetir opciones marque asterisco');
						}, 250);
					});

					/* Se definen los eventos asignados a cada opcion 1 al 4 */

					$("#uno").click(function(){
						window.speechSynthesis.cancel(); /* mediate el speech.cancel() es posible interrumpir la expliación de las
															opciones de forma que se va a la opción deseada si ya se conoce */
						/* 6.c Opcion Uno: minutos */									

						var mins = info.segs[0]/60; // como el dato se encuntra en segundos se divide entre 60
						var fech = info.segs[1].split('/');
						var vcto = new Date(fech[2]+'/'+fech[1]+'/'+fech[0]);

						$("button").attr('disabled', true);
						tune.play();

						if(mins>0 && vcto>hoy){ /* Se verifica que hayan minutos disponibles (>0) y que no hayan vencido */ 
							tune.onended = function(){
								speakIt('Usted tiene '+mins.toFixed(2).replace('.', ' punto ')+' minutos disponibles, que vencen el '+vcto.toLocaleDateString()+', gracias por llamar a TELCO', true);
								/* Incluyendo TRUE al final de la funcion speakIt la llamada finalizará */							
							}
						}
						else{ /* De no cumplirse una de la anteriores condiciones se le notifica al cliente */
							tune.onended = function(){
								speakIt('Lo sentimos, usted no cuenta con minutos disponibles, gracias por comunicarse con TELCO', true);
							}
						}

					});

					/* 6.d Opcion Dos: SMS */

					/* Observacion: La tabla ofrecia SMS decimales (ejm. 21.5) lo cual no es posible es por ello que se redondeo los valores */

					$("#dos").click(function(){
						window.speechSynthesis.cancel();

						var sms = parseFloat(info.sms[0]);
						var fech = info.sms[1].split('/');
						var vcto = new Date(fech[2]+'/'+fech[1]+'/'+fech[0]);

						$("button").attr('disabled', true);
						tune.play();

						if(sms > 0 && vcto>hoy){ /* Al igual que elcaso anterior se verifica cantidad y vencimiento y se le notifica al cliente */ 
							tune.onended = function(){
								/* se redondea con la función toFixed() */
								speakIt('Usted tiene '+sms.toFixed(0)+' mensajes de texto, que vencen el '+vcto.toLocaleDateString()+', gracias por llamar a TELCO', true);
							}
						}
						else{
							tune.onended = function(){
								speakIt('Lo sentimos, usted no cuenta con mensajes de texto, gracias por comunicarse con TELCO', true);
							}
						}
					});

					/* 6.e Opcion Tres: Datos */

					$("#tres").click(function(){
						window.speechSynthesis.cancel();

						var datos = info.datos[0]/1024; //se divide entre 1024 para pasar de bytes a megabytes
						var fech = info.datos[1].split('/'); /* el "spliteo" de la fecha que también se ha realizado en las opciones anteriores
																es para darle un formato válido en javascript pasandolo a la forma MM/DD/YYYY */
						var vcto = new Date(fech[2]+'/'+fech[1]+'/'+fech[0]);

						$("button").attr('disabled', true);
						tune.play();


						if(datos>0 && vcto>hoy){ /* Se verifica cantidad y vencimiento */
							tune.onended = function(){
								speakIt('Usted tiene '+datos.toFixed(2).replace('.', ' punto ')+' megabytes, que vencen el '+vcto.toLocaleDateString()+', gracias por llamar a TELCO', true);
							}
						}
						else{ /* De no poseer datos se le notifica al cliente */
							tune.onended = function(){
								speakIt('Lo sentimos, usted no cuenta con paquetes de datos, gracias por comunicarse con TELCO', true);
							}
						}
					});

					/* 6.f Opcion Cuatro: Saldo */

					$("#cuatro").click(function(){
						window.speechSynthesis.cancel();
						var saldo = info.saldo[0].split('.');
						var soles = saldo[0]; // se separan en dos variables soles y centimos para dar un resultado mas detallado
						var cents = saldo[1] || 0;
						var fech = info.saldo[1].split('/');
						var vcto = new Date(fech[2]+'/'+fech[1]+'/'+fech[0]);

						$("button").attr('disabled', true);
						tune.play();

						if(info.saldo[0] > 0 && vcto>hoy){ /* verficacion */
							tune.onended = function(){
								speakIt('Usted tiene '+soles+' soles con '+ cents*10 +' céntimos, que vencen el '+vcto.toLocaleDateString()+', gracias por llamar a TELCO', true);
							}
							/* NOTA: La funcion toLocaleDateString() permite darle un formato amigable la fecha para ser reconocido por la speech API */
						}
						else{
							tune.onended = function(){
								speakIt('Lo sentimos, usted no cuenta saldo disponible, gracias por comunicarse con TELCO', true);
							}
						}
					});
				}

			}
			else{ /* 6.g De no ser un número prepago se finaliza la llamada */
				tune.onended = function(){
					speakIt('Lo sentimos, usted no es un cliente prepago, gracias por comunicarse con TELCO', true);
				}
			}
		}

		/* P.D. Disculpe si se encuentra alguna falta ortográfica en los comentarios */

	});

});