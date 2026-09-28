---
name: ejecutar-proyecto-soapui
description: Enseña cómo instalar/localizar y ejecutar SoapUI TestRunner CLI para correr un proyecto SoapUI (el .xml generado por este repo o cualquier otro) desde línea de comandos o pipeline, sin necesitar la app de escritorio completa. Cubre 3 caminos (Java+jar de Maven, Docker oficial, o localizar una instalación existente) con sus requisitos y limitaciones reales. Úsala cuando el usuario pida ejecutar/correr las pruebas de un proyecto SoapUI generado, instalar SoapUI para CI/pipeline, correr el testrunner, o pregunte qué necesita para ejecutar el proyecto desde CLI. NO cubre generar el proyecto SoapUI desde un spec OpenAPI — para eso usa la skill `generar-proyecto-soapui`.
---

# Ejecutar proyecto SoapUI vía TestRunner CLI

Esta skill cubre **solo** cómo instalar/localizar y correr el SoapUI TestRunner sobre un proyecto `.xml` ya generado (por ejemplo con la skill `generar-proyecto-soapui`). No cubre cómo generar ese proyecto, ni instalar Docker/JDK en sí mismos — asume que el usuario decide qué entorno tiene disponible y esta skill lo guía sobre qué hacer con eso.

## Paso 0 — presentar las opciones, nunca asumir una

Antes de ejecutar nada, presentale al usuario las 3 opciones con sus requisitos, y preguntale cuál aplica a su entorno (o si ya tiene SoapUI instalado y dónde). No elijas una por defecto sin confirmar — cada una tiene trade-offs distintos.

| Opción | Requiere | Limitación / nota |
|---|---|---|
| **1. Java + jar de Maven** | JDK + Maven + red al repo SmartBear Nexus | Descarga inicial de dependencias transitivas (puede ser pesada); versión queda pineada a la que se declare (este repo usa `5.9.1`) |
| **2. Docker** | Docker instalado y corriendo | Cero JDK necesario en el host — el JRE va dentro de la imagen. Ojo con paths en Windows/Git Bash: usar rutas absolutas y `MSYS_NO_PATHCONV=1` si hay conversión rara de `/project` |
| **3. Instalación existente** | Que el usuario ya tenga SoapUI instalado (full installer) y sepa/pueda buscar la ruta | No instala nada nuevo. El instalador oficial trae su propio JRE embebido — no necesita Java del sistema |

Ninguna opción es "cero dependencias": SoapUI Core es una librería Java, siempre hay un JVM corriendo en algún lado (host, o dentro del contenedor Docker, o embebido en el instalador).

## Opción 1 — Java + jar de Maven

Útil si el pipeline ya es Java/Maven y no querés instalar la app completa.

1. Verificar JDK disponible:
   ```bash
   java -version
   ```
2. Resolver el jar de SoapUI Core + sus dependencias. Si tenés un `pom.xml` a mano (por ejemplo el de este mismo repo), agregale el repositorio y la dependencia si no están:
   ```xml
   <repositories>
     <repository>
       <id>SmartBearPluginRepository</id>
       <url>https://rapi.tools.ops.smartbear.io/nexus/content/groups/public/</url>
     </repository>
   </repositories>
   ```
   ```xml
   <dependency>
     <groupId>com.smartbear.soapui</groupId>
     <artifactId>soapui</artifactId>
     <version>5.9.1</version>
   </dependency>
   ```
3. Descargar los jars a una carpeta local:
   ```bash
   mvn dependency:copy-dependencies -DoutputDirectory=lib
   ```
4. Ejecutar el runner, invocando la misma clase que usa `testrunner.bat` internamente:
   ```bash
   java -Dlog4j2.formatMsgNoLookups=true -cp "lib/*" com.eviware.soapui.tools.SoapUITestCaseRunner ruta/proyecto.xml
   ```
5. Opcional, ajustar memoria si hace falta: agregar `-Xms128m -Xmx1024m` antes de `-cp`.

Si este repo específico ya tiene esa dependencia declarada (`pom.xml`, propiedad `soapui.version`), usá la misma versión pa evitar sorpresas de compatibilidad — verificala antes de fijar la versión en el proyecto auxiliar.

## Opción 2 — Docker

Imagen oficial de SmartBear para SoapUI open source: `smartbear/soapuios-testrunner` (Docker Hub). No confundir con `ready-api-soapui-testrunner`, que es para ReadyAPI (producto comercial), no para SoapUI open source.

1. Verificar Docker disponible:
   ```bash
   docker --version
   ```
2. Ejecutar montando la carpeta del proyecto y la de reportes:
   ```bash
   docker run \
     -v "/ruta/a/carpeta-proyecto":/project \
     -v "/ruta/a/carpeta-reportes":/reports \
     -e COMMAND_LINE="/project/proyecto.xml" \
     -it smartbear/soapuios-testrunner:latest
   ```
3. Revisar el exit code del contenedor para el gate del pipeline:

   | Exit code | Significado |
   |---|---|
   | `0` | Corrida ok (no implica que todos los test cases pasaron — revisar el log/reporte igual) |
   | `102` | Proyecto no encontrado en `/project` |
   | `103` | Error durante la corrida |

## Opción 3 — Localizar una instalación existente

La ruta de instalación **nunca se asume** (ej. no des por hecho `C:\Program Files\...`). Si no está confirmada en la conversación, preguntala. Si el usuario no la sabe, ofrecele buscarla él mismo en vez de escanear todo el disco:
- Acceso directo del menú inicio → clic derecho → Propiedades → campo "Destino" muestra la ruta del ejecutable
- Windows: `where.exe SoapUI.exe` (si está en PATH)
- Confirmar que existe `bin\testrunner.bat` (Windows) o `bin/testrunner.sh` (Linux/Mac) dentro de esa ruta

Ejecutar:
```powershell
& "<ruta-instalación>\bin\testrunner.bat" "ruta\proyecto.xml"
```
o en Linux/Mac:
```bash
<ruta-instalación>/bin/testrunner.sh ruta/proyecto.xml
```

El instalador oficial trae su propio JRE embebido (`testrunner.bat`/`.sh` primero busca `../jre/bin`, y solo cae a `JAVA_HOME`/PATH si esa carpeta no existe) — por eso esta opción no depende de tener Java instalado aparte.

## Nota sobre compatibilidad de versión

La versión de SoapUI usada para **ejecutar** no necesita ser idéntica a la que usó la herramienta para **generar** el proyecto — el formato del `.xml` de proyecto SoapUI es estable entre versiones 5.x. Si aparecen errores raros de parseo del XML al abrir/correr el proyecto, ahí sí vale la pena revisar si hay un desfase de versión mayor.

## Fuera de alcance

Esta skill no cubre:
- Generar el proyecto SoapUI desde un spec OpenAPI (ver skill `generar-proyecto-soapui`)
- Interpretar o parsear los resultados más allá del exit code y los logs crudos del testrunner
- Instalar Docker o el JDK en sí mismos — asume que el usuario ya tiene uno de los 3 entornos disponible, o decide instalarlo por su cuenta
