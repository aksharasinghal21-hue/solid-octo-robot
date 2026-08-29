/* =========================================================
   HEALUP
   Complete JavaScript
   No external audio files required
========================================================= */

const form = document.getElementById("scheduleForm");
const titleInput = document.getElementById("title");
const startInput = document.getElementById("startTime");
const endInput = document.getElementById("endTime");

const sampleBtn = document.getElementById("sampleBtn");
const clearBtn = document.getElementById("clearBtn");

const timeline = document.getElementById("timeline");
const eventCount = document.getElementById("eventCount");

const statusBanner = document.getElementById("statusBanner");
const statusTitle = document.getElementById("statusTitle");
const statusDescription = document.getElementById("statusDescription");
const statusCountdown = document.getElementById("statusCountdown");

const testSoundBtn = document.getElementById("testSoundBtn");


/* =========================================================
   STATE
========================================================= */

let schedule = [];

let selectedSound = "bird";

let audioContext = null;

let soundPlaying = false;

let lastBufferKey = "";


/* =========================================================
   RECOVERY TYPES
========================================================= */

const RECOVERY_TYPES = [

    {
        title: "20-20-20 Eye Rest",
        description:
            "Look away from your screen and let your eyes relax.",
        duration: 60,
        icon: "👁️"
    },

    {
        title: "Quick Stretch",
        description:
            "Roll your shoulders and gently stretch your neck.",
        duration: 60,
        icon: "🧘"
    },

    {
        title: "Hydrate",
        description:
            "Take a few calm sips of water.",
        duration: 30,
        icon: "💧"
    },

    {
        title: "Step Away",
        description:
            "Stand up and briefly step away from your screen.",
        duration: 120,
        icon: "🚶"
    }

];


const MIN_BUFFER = 10;

const ONE_HOUR = 3600;


/* =========================================================
   TIME FUNCTIONS
========================================================= */

function timeToSeconds(time) {

    const [hours, minutes] =
        time.split(":").map(Number);

    return (
        hours * 3600 +
        minutes * 60
    );
}


function formatTime(seconds) {

    seconds = Math.max(
        0,
        Math.floor(seconds)
    );

    const hours =
        Math.floor(seconds / 3600);

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const hour =
        hours % 12 || 12;

    const suffix =
        hours >= 12
            ? "PM"
            : "AM";

    return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}


function formatDuration(seconds) {

    seconds =
        Math.max(0, Math.floor(seconds));

    const minutes =
        Math.floor(seconds / 60);

    const remaining =
        seconds % 60;

    if (minutes > 0) {

        if (remaining === 0) {
            return `${minutes} min`;
        }

        return `${minutes} min ${remaining} sec`;
    }

    return `${remaining} sec`;
}


function formatCountdown(seconds) {

    seconds =
        Math.max(0, Math.ceil(seconds));

    const hours =
        Math.floor(seconds / 3600);

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;


    if (hours > 0) {

        return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    }


    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")}`
    );
}


function currentTimeSeconds() {

    const now = new Date();

    return (
        now.getHours() * 3600 +
        now.getMinutes() * 60 +
        now.getSeconds()
    );
}


function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


/* =========================================================
   AUDIO ENGINE
========================================================= */

function startAudio() {

    if (!audioContext) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }


    if (
        audioContext.state ===
        "suspended"
    ) {

        return audioContext.resume();

    }


    return Promise.resolve();
}


/* =========================================================
   MASTER VOLUME
========================================================= */

function createMasterGain() {

    const gain =
        audioContext.createGain();

    gain.gain.value = 0.18;

    gain.connect(
        audioContext.destination
    );

    return gain;
}


/* =========================================================
   BIRD CHIRPING
========================================================= */

function playBird() {

    const master =
        createMasterGain();


    const now =
        audioContext.currentTime;


    /*
       Several soft chirps with different
       pitches and spacing.
    */

    const chirps = [

        [0.00, 1800, 0.16],
        [0.24, 2300, 0.14],
        [0.48, 1950, 0.18],

        [1.05, 2500, 0.13],
        [1.27, 2900, 0.12],

        [1.85, 2100, 0.18],
        [2.10, 2600, 0.15],

        [2.75, 2300, 0.17],
        [3.05, 2800, 0.14],

        [3.65, 2000, 0.18]

    ];


    chirps.forEach(
        ([delay, frequency, duration]) => {

            const osc =
                audioContext.createOscillator();

            const gain =
                audioContext.createGain();


            osc.type =
                "sine";


            osc.frequency.setValueAtTime(
                frequency,
                now + delay
            );


            osc.frequency.exponentialRampToValueAtTime(
                frequency * 1.35,
                now + delay + duration
            );


            gain.gain.setValueAtTime(
                0,
                now + delay
            );


            gain.gain.linearRampToValueAtTime(
                0.22,
                now + delay + 0.025
            );


            gain.gain.exponentialRampToValueAtTime(
                0.001,
                now + delay + duration
            );


            osc.connect(gain);

            gain.connect(master);


            osc.start(
                now + delay
            );


            osc.stop(
                now + delay + duration + 0.05
            );

        }
    );


    master.gain.setValueAtTime(
        0.15,
        now
    );


    master.gain.exponentialRampToValueAtTime(
        0.001,
        now + 4.5
    );
}


/* =========================================================
   KITTEN MEOW
========================================================= */
function playKitten() {

    const master = createMasterGain();
    const now = audioContext.currentTime;

    /*
       Soft but recognizable "MEOW"
       Uses multiple oscillators to create
       a more vocal-like kitten sound.
    */

    const voice = audioContext.createOscillator();
    const voiceGain = audioContext.createGain();

    const harmonic = audioContext.createOscillator();
    const harmonicGain = audioContext.createGain();

    const filter = audioContext.createBiquadFilter();


    /* Main kitten voice */

    voice.type = "sawtooth";

    voice.frequency.setValueAtTime(
        520,
        now
    );

    /* "M" beginning */

    voice.frequency.linearRampToValueAtTime(
        430,
        now + 0.16
    );

    /* "E" vowel rises */

    voice.frequency.linearRampToValueAtTime(
        760,
        now + 0.42
    );

    /* "OW" falls */

    voice.frequency.exponentialRampToValueAtTime(
        410,
        now + 1.15
    );

    voice.frequency.exponentialRampToValueAtTime(
        280,
        now + 1.45
    );


    /* Vocal envelope */

    voiceGain.gain.setValueAtTime(
        0.001,
        now
    );

    voiceGain.gain.linearRampToValueAtTime(
        0.07,
        now + 0.08
    );

    voiceGain.gain.linearRampToValueAtTime(
        0.22,
        now + 0.30
    );

    voiceGain.gain.linearRampToValueAtTime(
        0.17,
        now + 0.70
    );

    voiceGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 1.5
    );


    /* Warm vocal filter */

    filter.type = "bandpass";

    filter.frequency.setValueAtTime(
        1100,
        now
    );

    filter.Q.value = 1.2;


    /* Second harmonic */

    harmonic.type = "triangle";

    harmonic.frequency.setValueAtTime(
        1040,
        now
    );

    harmonic.frequency.linearRampToValueAtTime(
        860,
        now + 0.16
    );

    harmonic.frequency.linearRampToValueAtTime(
        1520,
        now + 0.42
    );

    harmonic.frequency.exponentialRampToValueAtTime(
        560,
        now + 1.3
    );


    harmonicGain.gain.setValueAtTime(
        0.001,
        now
    );

    harmonicGain.gain.linearRampToValueAtTime(
        0.055,
        now + 0.15
    );

    harmonicGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 1.35
    );


    voice
        .connect(voiceGain)
        .connect(filter)
        .connect(master);


    harmonic
        .connect(harmonicGain)
        .connect(filter);


    voice.start(now);

    harmoni6^^^^^^^^^^^^^^^^c.start(now);


    voice.stop(
        now + 1.55
    );

    harmonic.stop(
        now + 1.45
    );


    /* Gentle overall volume */

    master.gain.setValueAtTime(
        0.12,
        now
    );

    master.gain.exponentialRampToValueAtTime(
        0.001,
        now + 1.7
    );
}


/* =========================================================
   WATER DROP
========================================================= */

function playWater() {

    const master = createMasterGain();
    const now = audioContext.currentTime;

    /*
       Calm water ripple:
       several soft descending tones create
       the feeling of a small water ripple
       rather than a sharp digital drop.
    */

    const ripples = [
        { delay: 0.00, freq: 720,  volume: 0.16 },
        { delay: 0.18, freq: 940,  volume: 0.11 },
        { delay: 0.36, freq: 680,  volume: 0.10 },
        { delay: 0.58, freq: 820,  volume: 0.08 },
        { delay: 0.82, freq: 560,  volume: 0.07 },
        { delay: 1.08, freq: 440,  volume: 0.05 }
    ];

    ripples.forEach(ripple => {

        const osc =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        const filter =
            audioContext.createBiquadFilter();


        osc.type = "sine";

        osc.frequency.setValueAtTime(
            ripple.freq,
            now + ripple.delay
        );

        osc.frequency.exponentialRampToValueAtTime(
            ripple.freq * 0.72,
            now + ripple.delay + 0.7
        );


        filter.type = "lowpass";

        filter.frequency.setValueAtTime(
            1800,
            now + ripple.delay
        );


        gain.gain.setValueAtTime(
            0.001,
            now + ripple.delay
        );

        gain.gain.exponentialRampToValueAtTime(
            ripple.volume,
            now + ripple.delay + 0.04
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + ripple.delay + 0.75
        );


        osc
            .connect(filter)
            .connect(gain)
            .connect(master);


        osc.start(
            now + ripple.delay
        );

        osc.stop(
            now + ripple.delay + 0.8
        );

    });


    /*
       Very soft background resonance,
       making the sound feel less electronic.
    */

    const resonance =
        audioContext.createOscillator();

    const resonanceGain =
        audioContext.createGain();


    resonance.type = "sine";

    resonance.frequency.setValueAtTime(
        330,
        now
    );

    resonance.frequency.exponentialRampToValueAtTime(
        210,
        now + 2.2
    );


    resonanceGain.gain.setValueAtTime(
        0.001,
        now
    );

    resonanceGain.gain.exponentialRampToValueAtTime(
        0.045,
        now + 0.25
    );

    resonanceGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 2.4
    );


    resonance
        .connect(resonanceGain)
        .connect(master);


    resonance.start(now);

    resonance.stop(
        now + 2.5
    );


    /*
       Gentle overall fade-out.
    */

    master.gain.setValueAtTime(
        0.13,
        now
    );

    master.gain.exponentialRampToValueAtTime(
        0.001,
        now + 2.6
    );
}


/* =========================================================
   GENTLE RAIN
========================================================= */

function playRain() {

    const master =
        createMasterGain();


    const now =
        audioContext.currentTime;


    /*
       Create a short soft rain texture
       using filtered noise.
    */

    const bufferSize =
        audioContext.sampleRate * 4;


    const noiseBuffer =
        audioContext.createBuffer(
            1,
            bufferSize,
            audioContext.sampleRate
        );


    const data =
        noiseBuffer.getChannelData(0);


    for (
        let i = 0;
        i < bufferSize;
        i++
    ) {

        data[i] =
            (Math.random() * 2 - 1) *
            0.28;

    }


    const noise =
        audioContext.createBufferSource();

    noise.buffer =
        noiseBuffer;


    const filter =
        audioContext.createBiquadFilter();


    filter.type =
        "lowpass";


    filter.frequency.value =
        2400;


    filter.Q.value =
        0.7;


    const gain =
        audioContext.createGain();


    gain.gain.setValueAtTime(
        0.001,
        now
    );


    gain.gain.linearRampToValueAtTime(
        0.15,
        now + 0.7
    );


    gain.gain.linearRampToValueAtTime(
        0.09,
        now + 2.5
    );


    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 4
    );


    noise
        .connect(filter)
        .connect(gain)
        .connect(master);


    noise.start(now);

    noise.stop(
        now + 4
    );


    /*
       Add occasional gentle drops.
    */

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const delay =
            0.5 +
            Math.random() * 3;


        const drop =
            audioContext.createOscillator();

        const dropGain =
            audioContext.createGain();


        drop.type =
            "sine";


        drop.frequency.value =
            1200 +
            Math.random() * 700;


        dropGain.gain.setValueAtTime(
            0.001,
            now + delay
        );


        dropGain.gain.exponentialRampToValueAtTime(
            0.08,
            now + delay + 0.01
        );


        dropGain.gain.exponentialRampToValueAtTime(
            0.001,
            now + delay + 0.25
        );


        drop
            .connect(dropGain)
            .connect(master);


        drop.start(
            now + delay
        );

        drop.stop(
            now + delay + 0.3
        );

    }
}


/* =========================================================
   PLAY SELECTED SOUND
========================================================= */

async function playSelectedSound() {

    try {

        await startAudio();

        soundPlaying = true;


        switch (
            selectedSound
        ) {

            case "bird":

                playBird();

                break;


            case "kitten":

                playKitten();

                break;


            case "water":

                playWater();

                break;


            case "rain":

                playRain();

                break;

        }


        setTimeout(
            () => {

                soundPlaying = false;

            },
            4500
        );

    }

    catch (error) {

        console.error(
            "Healup audio error:",
            error
        );

    }

}


/* =========================================================
   SOUND SELECTION
========================================================= */

document
    .querySelectorAll(".sound-option")
    .forEach(option => {

        option.addEventListener(
            "click",
            () => {

                const radio =
                    option.querySelector(
                        "input[type='radio']"
                    );


                if (!radio) {
                    return;
                }


                selectedSound =
                    radio.value;


                document
                    .querySelectorAll(
                        ".sound-option"
                    )
                    .forEach(item => {

                        item.classList.remove(
                            "selected"
                        );

                    });


                option.classList.add(
                    "selected"
                );


                radio.checked =
                    true;

            }
        );

    });


/* =========================================================
   TEST SOUND BUTTON
========================================================= */

if (testSoundBtn) {

    testSoundBtn.addEventListener(
        "click",
        async () => {

            await playSelectedSound();


            const original =
                testSoundBtn.textContent;


            testSoundBtn.textContent =
                "✓ Playing";


            testSoundBtn.disabled =
                true;


            setTimeout(
                () => {

                    testSoundBtn.textContent =
                        original;

                    testSoundBtn.disabled =
                        false;

                },
                4500
            );

        }
    );

}


/* =========================================================
   SORT SCHEDULE
========================================================= */

function sortSchedule() {

    schedule.sort(
        (a, b) =>
            timeToSeconds(a.start) -
            timeToSeconds(b.start)
    );

}


/* =========================================================
   BUILD TIMELINE
========================================================= */

function buildTimeline() {

    sortSchedule();


    const segments = [];


    for (
        let i = 0;
        i < schedule.length;
        i++
    ) {

        const event =
            schedule[i];


        const start =
            timeToSeconds(
                event.start
            );

        const end =
            timeToSeconds(
                event.end
            );


        segments.push({

            type: "busy",

            event,

            start,

            end

        });


        /*
           Natural gap after this event.
        */

        if (
            i <
            schedule.length - 1
        ) {

            const next =
                schedule[i + 1];


            const nextStart =
                timeToSeconds(
                    next.start
                );


            const gap =
                nextStart -
                end;


            if (
                gap > 0
            ) {

                const recovery =
                    RECOVERY_TYPES[
                        i %
                        RECOVERY_TYPES.length
                    ];


                segments.push({

                    type:
                        "buffer",

                    start:
                        end,

                    end:
                        nextStart,

                    recovery

                });

            }

        }

    }


    /*
       Add automatic buffers for continuous
       schedules lasting one hour or more.

       IMPORTANT:

       A 3-hour continuous schedule gets
       actual recovery checkpoints.

       Example:

       09:00-10:00 Busy
       10:00-10:01 Buffer
       10:01-11:00 Busy
       11:00-11:01 Buffer
       11:01-12:00 Busy
    */

    const additionalBuffers = [];


    let recoveryIndex =
        0;


    /*
       Find continuous periods.
    */

    let periodStart = null;
    let periodEnd = null;


    for (
        let i = 0;
        i < schedule.length;
        i++
    ) {

        const event =
            schedule[i];


        const start =
            timeToSeconds(
                event.start
            );

        const end =
            timeToSeconds(
                event.end
            );


        if (
            periodStart === null
        ) {

            periodStart =
                start;

            periodEnd =
                end;

            continue;

        }


        const previous =
            schedule[i - 1];


        const previousEnd =
            timeToSeconds(
                previous.end
            );


        /*
           Back-to-back.
        */

        if (
            start <=
            previousEnd
        ) {

            periodEnd =
                Math.max(
                    periodEnd,
                    end
                );

        } else {

            addHourlyBuffers(
                periodStart,
                periodEnd,
                additionalBuffers,
                () => {

                    const value =
                        RECOVERY_TYPES[
                            recoveryIndex %
                            RECOVERY_TYPES.length
                        ];

                    recoveryIndex++;

                    return value;

                }
            );


            periodStart =
                start;

            periodEnd =
                end;

        }

    }


    if (
        periodStart !== null
    ) {

        addHourlyBuffers(
            periodStart,
            periodEnd,
            additionalBuffers,
            () => {

                const value =
                    RECOVERY_TYPES[
                        recoveryIndex %
                        RECOVERY_TYPES.length
                    ];

                recoveryIndex++;

                return value;

            }
        );

    }


    /*
       Add hourly buffers.
    */

    additionalBuffers.forEach(
        buffer => {

            const duplicate =
                segments.some(
                    segment =>
                        segment.type ===
                            "buffer" &&
                        segment.start ===
                            buffer.start &&
                        segment.end ===
                            buffer.end
                );


            if (!duplicate) {

                segments.push(
                    buffer
                );

            }

        }
    );


    segments.sort(
        (a, b) =>
            a.start -
            b.start
    );


    return splitBusySegments(
        segments
    );
}


/* =========================================================
   ADD HOURLY BUFFERS
========================================================= */

function addHourlyBuffers(
    start,
    end,
    output,
    getRecovery
) {

    const total =
        end - start;


    /*
       Only continuous periods of one hour
       or more need an internal buffer.
    */

    if (
        total <
        ONE_HOUR
    ) {

        return;

    }


    let checkpoint =
        start +
        ONE_HOUR;


    while (
        checkpoint <
        end
    ) {

        const recovery =
            getRecovery();


        /*
           We always guarantee at least 10 sec.

           If there is less than the normal
           recovery duration available, use
           the remaining time.
        */

        const available =
            end -
            checkpoint;


        const duration =
            Math.max(
                MIN_BUFFER,
                Math.min(
                    recovery.duration,
                    available
                )
            );


        if (
            available >=
            MIN_BUFFER
        ) {

            output.push({

                type:
                    "buffer",

                start:
                    checkpoint,

                end:
                    checkpoint +
                    duration,

                recovery

            });


            checkpoint +=
                duration;

        } else {

            break;

        }


        /*
           Continue counting another hour
           after the buffer.
        */

        checkpoint +=
            ONE_HOUR;

    }

}


/* =========================================================
   SPLIT BUSY SEGMENTS AROUND BUFFERS
========================================================= */

function splitBusySegments(
    segments
) {

    const buffers =
        segments
            .filter(
                segment =>
                    segment.type ===
                    "buffer"
            );


    const result = [];


    segments
        .filter(
            segment =>
                segment.type ===
                "busy"
        )
        .forEach(
            segment => {

                let cursor =
                    segment.start;


                const relevant =
                    buffers
                        .filter(
                            buffer =>
                                buffer.start >
                                    segment.start &&
                                buffer.start <
                                    segment.end
                        )
                        .sort(
                            (a, b) =>
                                a.start -
                                b.start
                        );


                relevant.forEach(
                    buffer => {

                        if (
                            buffer.start >
                            cursor
                        ) {

                            result.push({

                                type:
                                    "busy",

                                event:
                                    segment.event,

                                start:
                                    cursor,

                                end:
                                    buffer.start

                            });

                        }


                        result.push(
                            buffer
                        );


                        cursor =
                            buffer.end;

                    }
                );


                if (
                    cursor <
                    segment.end
                ) {

                    result.push({

                        type:
                            "busy",

                        event:
                            segment.event,

                        start:
                            cursor,

                        end:
                            segment.end

                    });

                }

            }
        );


    /*
       Add natural buffers.
    */

    buffers.forEach(
        buffer => {

            const exists =
                result.some(
                    item =>
                        item.type ===
                            "buffer" &&
                        item.start ===
                            buffer.start &&
                        item.end ===
                            buffer.end
                );


            if (!exists) {

                result.push(
                    buffer
                );

            }

        }
    );


    return result.sort(
        (a, b) =>
            a.start -
            b.start
    );
}


/* =========================================================
   RENDER
========================================================= */

function renderTimeline() {

    timeline.innerHTML = "";


    if (
        schedule.length === 0
    ) {

        eventCount.textContent =
            "0 blocks";


        timeline.innerHTML = `

            <div class="empty-state">

                <div class="empty-symbol">
                    +
                </div>

                <h3>
                    Your day is open.
                </h3>

                <p>
                    Add your first class or meeting,
                    or load the sample schedule.
                </p>

            </div>

        `;


        updateStatus();

        return;

    }


    eventCount.textContent =
        `${schedule.length} ${
            schedule.length === 1
                ? "block"
                : "blocks"
        }`;


    const segments =
        buildTimeline();


    segments.forEach(
        segment => {

            if (
                segment.type ===
                "busy"
            ) {

                renderBusy(
                    segment
                );

            } else {

                renderBuffer(
                    segment
                );

            }

        }
    );


    updateStatus();
}


/* =========================================================
   RENDER BUSY
========================================================= */

function renderBusy(
    segment
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "timeline-item";


    item.dataset.start =
        segment.start;

    item.dataset.end =
        segment.end;

    item.dataset.eventId =
        segment.event.id;


    item.innerHTML = `

        <div class="busy-dot"></div>

        <div class="busy-card">

            <div class="block-time">

                <strong>
                    ${formatTime(
                        segment.start
                    )}
                </strong>

                <span>
                    ${formatTime(
                        segment.end
                    )}
                </span>

            </div>


            <div class="block-info">

                <div class="block-title">

                    ${escapeHTML(
                        segment.event.title
                    )}

                </div>

                <div class="block-duration">

                    ${formatDuration(
                        segment.end -
                        segment.start
                    )}

                </div>

            </div>


            <div class="busy-tag">
                BUSY
            </div>


            <button
                type="button"
                class="delete-button"
                data-delete="${segment.event.id}"
                aria-label="Delete"
            >
                ×
            </button>

        </div>

    `;


    timeline.appendChild(
        item
    );
}


/* =========================================================
   RENDER BUFFER
========================================================= */

function renderBuffer(
    segment
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "timeline-item";


    item.dataset.bufferStart =
        segment.start;

    item.dataset.bufferEnd =
        segment.end;


    item.innerHTML = `

        <div class="buffer-dot"></div>

        <div class="buffer-card">

            <div class="buffer-icon">

                ${segment.recovery.icon}

            </div>


            <div>

                <div class="buffer-label">
                    BUFFER BREAK
                </div>

                <div class="buffer-prompt">

                    ${segment.recovery.title}

                </div>

                <div class="buffer-description">

                    ${segment.recovery.description}

                </div>

            </div>


            <div class="buffer-time">

                ${formatTime(
                    segment.start
                )}

                —

                ${formatTime(
                    segment.end
                )}

                <br>

                ${formatDuration(
                    segment.end -
                    segment.start
                )}

            </div>

        </div>

    `;


    timeline.appendChild(
        item
    );
}


/* =========================================================
   CURRENT STATE
========================================================= */

function getCurrentState() {

    if (
        schedule.length === 0
    ) {

        return {
            type: "empty"
        };

    }


    const now =
        currentTimeSeconds();


    const segments =
        buildTimeline();


    const active =
        segments.find(
            segment =>
                now >= segment.start &&
                now < segment.end
        );


    if (active) {

        if (
            active.type ===
            "busy"
        ) {

            return {

                type:
                    "busy",

                event:
                    active.event,

                start:
                    active.start,

                end:
                    active.end,

                remaining:
                    active.end -
                    now

            };

        }


        return {

            type:
                "buffer",

            start:
                active.start,

            end:
                active.end,

            remaining:
                active.end -
                now,

            recovery:
                active.recovery

        };

    }


    const next =
        segments.find(
            segment =>
                segment.start >
                now
        );


    if (next) {

        return {

            type:
                "upcoming",

            start:
                next.start,

            remaining:
                next.start -
                now,

            segment:
                next

        };

    }


    return {

        type:
            "finished"

    };
}


/* =========================================================
   STATUS UPDATE
========================================================= */

function updateStatus() {

    const state =
        getCurrentState();


    document
        .querySelectorAll(
            ".busy-card.active, .buffer-card.active"
        )
        .forEach(
            card =>
                card.classList.remove(
                    "active"
                )
        );


    statusBanner.classList.remove(
        "buffer-active"
    );


    if (
        state.type ===
        "empty"
    ) {

        statusTitle.textContent =
            "No schedule loaded";

        statusDescription.textContent =
            "Add a class or meeting to begin.";

        statusCountdown.textContent =
            "--:--";

        return;

    }


    if (
        state.type ===
        "busy"
    ) {

        statusTitle.textContent =
            state.event.title;

        statusDescription.textContent =
            `Busy until ${formatTime(
                state.end
            )}`;

        statusCountdown.textContent =
            formatCountdown(
                state.remaining
            );


        highlightBusy(
            state.event.id,
            state.start,
            state.end
        );


        return;

    }


    if (
        state.type ===
        "buffer"
    ) {

        statusBanner.classList.add(
            "buffer-active"
        );


        statusTitle.textContent =
            state.recovery.title;


        statusDescription.textContent =
            state.recovery.description;


        statusCountdown.textContent =
            formatCountdown(
                state.remaining
            );


        highlightBuffer(
            state.start,
            state.end
        );


        const key =
            `${state.start}-${state.end}`;


        /*
           Play sound only once.
        */

        if (
            lastBufferKey !==
            key
        ) {

            playSelectedSound();

            lastBufferKey =
                key;

        }


        return;

    }


    if (
        state.type ===
        "upcoming"
    ) {

        if (
            state.segment.type ===
            "busy"
        ) {

            statusTitle.textContent =
                `Next: ${state.segment.event.title}`;

            statusDescription.textContent =
                `Starting at ${formatTime(
                    state.segment.start
                )}`;

        } else {

            statusTitle.textContent =
                "Recovery break coming up";

            statusDescription.textContent =
                "A wellness moment is scheduled.";

        }


        statusCountdown.textContent =
            formatCountdown(
                state.remaining
            );

        return;

    }


    statusTitle.textContent =
        "Schedule complete";

    statusDescription.textContent =
        "You've made it through today's timeline.";

    statusCountdown.textContent =
        "DONE";
}


/* =========================================================
   HIGHLIGHT BUSY
========================================================= */

function highlightBusy(
    eventId,
    start,
    end
) {

    document
        .querySelectorAll(
            ".timeline-item"
        )
        .forEach(
            item => {

                if (
                    item.dataset.eventId ===
                        eventId &&
                    Number(
                        item.dataset.start
                    ) === start &&
                    Number(
                        item.dataset.end
                    ) === end
                ) {

                    const card =
                        item.querySelector(
                            ".busy-card"
                        );


                    if (card) {

                        card.classList.add(
                            "active"
                        );

                    }

                }

            }
        );
}


/* =========================================================
   HIGHLIGHT BUFFER
========================================================= */

function highlightBuffer(
    start,
    end
) {

    document
        .querySelectorAll(
            ".timeline-item"
        )
        .forEach(
            item => {

                if (
                    Number(
                        item.dataset.bufferStart
                    ) === start &&
                    Number(
                        item.dataset.bufferEnd
                    ) === end
                ) {

                    const card =
                        item.querySelector(
                            ".buffer-card"
                        );


                    if (card) {

                        card.classList.add(
                            "active"
                        );

                    }

                }

            }
        );
}


/* =========================================================
   ADD EVENT
========================================================= */

form.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const title =
            titleInput.value.trim();

        const start =
            startInput.value;

        const end =
            endInput.value;


        if (
            !title ||
            !start ||
            !end
        ) {

            return;

        }


        const startSeconds =
            timeToSeconds(start);

        const endSeconds =
            timeToSeconds(end);


        if (
            endSeconds <=
            startSeconds
        ) {

            alert(
                "End time must be later than start time."
            );

            return;

        }


        schedule.push({

            id:
                Date.now() +
                Math.random(),

            title,

            start,

            end

        });


        sortSchedule();


        lastBufferKey =
            "";


        renderTimeline();


        form.reset();


        titleInput.focus();

    }
);


/* =========================================================
   SAMPLE SCHEDULE
========================================================= */

sampleBtn.addEventListener(
    "click",
    () => {

        schedule = [

            {
                id: "sample1",
                title: "Morning Class",
                start: "08:00",
                end: "09:00"
            },

            {
                id: "sample2",
                title: "Design Lecture",
                start: "09:00",
                end: "10:00"
            },

            {
                id: "sample3",
                title: "Team Meeting",
                start: "10:00",
                end: "11:00"
            },

            {
                id: "sample4",
                title: "Project Work",
                start: "11:00",
                end: "12:00"
            },

            {
                id: "sample5",
                title: "Lunch / Study",
                start: "12:15",
                end: "13:15"
            }

        ];


        lastBufferKey =
            "";


        renderTimeline();

    }
);


/* =========================================================
   CLEAR
========================================================= */

clearBtn.addEventListener(
    "click",
    () => {

        schedule = [];

        lastBufferKey = "";

        renderTimeline();

    }
);


/* =========================================================
   DELETE EVENT
========================================================= */

timeline.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-delete]"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.delete;


        schedule =
            schedule.filter(
                item =>
                    String(item.id) !==
                    String(id)
            );


        lastBufferKey =
            "";


        renderTimeline();

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

renderTimeline();


/* =========================================================
   LIVE CLOCK
========================================================= */

setInterval(
    () => {

        updateStatus();

    },
    1000
);