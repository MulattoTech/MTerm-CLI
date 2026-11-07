# Third-party inventory

MTerm-owned code is MIT. Dependencies retain their own notices and are not re-licensed by MTerm.

- @modelcontextprotocol/server 2.3.0: package declaration Apache-2.0; retained root license includes the Apache/MIT transition and documentation notice; runtime. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- @modelcontextprotocol/core 2.3.0: same SDK mixed root notice; transitive runtime dependency.
- @modelcontextprotocol/client 2.3.0: same SDK mixed root notice; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- zod 4.6.7: MIT; runtime. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- typescript 7.0.2: Apache-2.0; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- @types/node 26.6.4: MIT; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.
- prettier 3.9.9: MIT; development only. Integrity is recorded in the npm lock/shrinkwrap and versions.json.

The installed Codex is an external prerequisite, not vendored source or a bundled executable.
Its original OpenAI project/license remains separate (the project uses Apache-2.0). The wrapper
uses the official existing executable/npm entry and does not modify it. No Web-launcher or
pi-codex-status code is included yet. Their licenses, exact commits and compatibility must be
re-verified before importing or shipping those components.

Keep production dependency license files in distribution. Python/TypeScript compiler, official
MCP test client and formatting tools are development-only. The installed application does not
require Qt/Electron, a C++ toolchain or Python. System Node remains a declared prerequisite.

## Read-only parity reference snapshots

`docs/parity/upstream/` contains selected MIT DesktopCommanderMCP0.2.52 source at
c774c3b505de990219637ecdc9a830c8772fae9d. Original LICENSE is retained there. Those files
are not attributed to MTerm or bundled in the installed runtime; they are hashed conformance inputs.
They are never executed by the drift detector.

## SDK embedded-component notices — 2026-11-07

The runtime SDK server2.3.0 source pin is `a202a3621fcb97918e09fa45d0f9efd2dbdee19b`.
Its npm package separately installs core2.3.0 and Zod, and also embeds the eight components below in JavaScript, declarations or source maps. These complete notices supplement the original SDK LICENSE retained in each installed SDK package. They do not relicense any dependency.

The independent artifact review matched114 unique nonempty external source-map payloads to integrity-verified tarballs and17 static JSON modules in both Ajv bundle formats. Sixteen JSON modules derive from JSON Schema meta-schemas. Their published Ajv variants are not asserted to equal every current historical draft branch. We select JSON Schema's BSD-3-Clause option, as clarified at the pinned license commit and [official upstream discussion](https://github.com/json-schema-org/json-schema-spec/issues/1160#issuecomment-1123583441).

`@cfworker/json-schema` omits LICENSE in its tarball; its complete text below comes from the official repository at the actual npm gitHead. License text is retained with LF line endings; raw upstream/tarball hashes remain separately recorded in `docs/provenance/sdk-bundled-review.json`. No implementation from these projects is newly vendored here.

This notice-retention repair is separate from full artifact admission, a complete embedded-component SPDX graph, and reproducible-build acceptance. The provenance qualification keeps those broader claims pending.

### ajv 8.18.0

License selection: MIT. Upstream: [repository](https://github.com/ajv-validator/ajv), commit `142ce84b807c4fe66e619c22480a28d0e4bd50fa`; [complete source license](https://raw.githubusercontent.com/ajv-validator/ajv/142ce84b807c4fe66e619c22480a28d0e4bd50fa/LICENSE).

<!-- MTERM-LICENSE sdk-1 BEGIN -->
```text
The MIT License (MIT)

Copyright (c) 2015-2021 Evgeny Poberezkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
<!-- MTERM-LICENSE sdk-1 END -->

### ajv-formats 3.0.1

License selection: MIT. Upstream: [repository](https://github.com/ajv-validator/ajv-formats), commit `1fb3fa7d967f919ff924bb34aef73a2f39ab0de3`; [complete source license](https://raw.githubusercontent.com/ajv-validator/ajv-formats/1fb3fa7d967f919ff924bb34aef73a2f39ab0de3/LICENSE).

<!-- MTERM-LICENSE sdk-2 BEGIN -->
```text
MIT License

Copyright (c) 2020 Evgeny Poberezkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
<!-- MTERM-LICENSE sdk-2 END -->

### fast-deep-equal 3.1.3

License selection: MIT. Upstream: [repository](https://github.com/epoberezkin/fast-deep-equal), commit `d807ffc5013e710deb1c63d463a03f729bcd144d`; [complete source license](https://raw.githubusercontent.com/epoberezkin/fast-deep-equal/d807ffc5013e710deb1c63d463a03f729bcd144d/LICENSE).

<!-- MTERM-LICENSE sdk-3 BEGIN -->
```text
MIT License

Copyright (c) 2017 Evgeny Poberezkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
<!-- MTERM-LICENSE sdk-3 END -->

### json-schema-traverse 1.0.0

License selection: MIT. Upstream: [repository](https://github.com/epoberezkin/json-schema-traverse), commit `6b45983cd76270042cc79527da5c8972f13599ec`; [complete source license](https://raw.githubusercontent.com/epoberezkin/json-schema-traverse/6b45983cd76270042cc79527da5c8972f13599ec/LICENSE).

<!-- MTERM-LICENSE sdk-4 BEGIN -->
```text
MIT License

Copyright (c) 2017 Evgeny Poberezkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
<!-- MTERM-LICENSE sdk-4 END -->

### fast-uri 3.1.0

License selection: BSD-3-Clause. Upstream: [repository](https://github.com/fastify/fast-uri), commit `2d08e68f4068320aa3f9da93a6f150e57af50c42`; [complete source license](https://raw.githubusercontent.com/fastify/fast-uri/2d08e68f4068320aa3f9da93a6f150e57af50c42/LICENSE).

<!-- MTERM-LICENSE sdk-5 BEGIN -->
```text
Copyright (c) 2011-2021, Gary Court until https://github.com/garycourt/uri-js/commit/a1acf730b4bba3f1097c9f52e7d9d3aba8cdcaae
Copyright (c) 2021-present The Fastify team
All rights reserved.

The Fastify team members are listed at https://github.com/fastify/fastify#team.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * The names of any contributors may not be used to endorse or promote
      products derived from this software without specific prior written
      permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS AND CONTRIBUTORS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

                                  *   *   *

The complete list of contributors can be found at:
- https://github.com/garycourt/uri-js/graphs/contributors
```
<!-- MTERM-LICENSE sdk-5 END -->

### @cfworker/json-schema 4.1.1

License selection: MIT. Upstream: [repository](https://github.com/cfworker/cfworker), commit `5409fdc2bd144f68e8b28c61c71fcb16600000a6`; [complete source license](https://raw.githubusercontent.com/cfworker/cfworker/5409fdc2bd144f68e8b28c61c71fcb16600000a6/LICENSE.md).

<!-- MTERM-LICENSE sdk-6 BEGIN -->
```text
MIT License

Copyright (c) 2020 Jeremy Danyow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
<!-- MTERM-LICENSE sdk-6 END -->

### content-type 1.0.5

License selection: MIT. Upstream: [repository](https://github.com/jshttp/content-type), commit `6115a4064e4dfd9845241c3f89c233ee2423deeb`; [complete source license](https://raw.githubusercontent.com/jshttp/content-type/6115a4064e4dfd9845241c3f89c233ee2423deeb/LICENSE).

<!-- MTERM-LICENSE sdk-7 BEGIN -->
```text
(The MIT License)

Copyright (c) 2015 Douglas Christopher Wilson

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
<!-- MTERM-LICENSE sdk-7 END -->

### json-schema-typed 8.0.2

License selection: BSD-2-Clause. Upstream: [repository](https://github.com/RemyRylan/json-schema-typed), commit `613f3ab84c8e1b14de492534bfcb81d1499610a3`; [complete source license](https://raw.githubusercontent.com/RemyRylan/json-schema-typed/613f3ab84c8e1b14de492534bfcb81d1499610a3/LICENSE.md).

<!-- MTERM-LICENSE sdk-8 BEGIN -->
```text
BSD 2-Clause License

Original source code is copyright (c) 2019-2025 Remy Rylan
<https://github.com/RemyRylan>

All JSON Schema documentation and descriptions are copyright (c):

2009 [draft-0] IETF Trust <https://www.ietf.org/>, Kris Zyp <kris@sitepen.com>,
and SitePen (USA) <https://www.sitepen.com/>.

2009 [draft-1] IETF Trust <https://www.ietf.org/>, Kris Zyp <kris@sitepen.com>,
and SitePen (USA) <https://www.sitepen.com/>.

2010 [draft-2] IETF Trust <https://www.ietf.org/>, Kris Zyp <kris@sitepen.com>,
and SitePen (USA) <https://www.sitepen.com/>.

2010 [draft-3] IETF Trust <https://www.ietf.org/>, Kris Zyp <kris@sitepen.com>,
Gary Court <gary.court@gmail.com>, and SitePen (USA) <https://www.sitepen.com/>.

2013 [draft-4] IETF Trust <https://www.ietf.org/>), Francis Galiegue
<fgaliegue@gmail.com>, Kris Zyp <kris@sitepen.com>, Gary Court
<gary.court@gmail.com>, and SitePen (USA) <https://www.sitepen.com/>.

2018 [draft-7] IETF Trust <https://www.ietf.org/>, Austin Wright <aaa@bzfx.net>,
Henry Andrews <henry@cloudflare.com>, Geraint Luff <luffgd@gmail.com>, and
Cloudflare, Inc. <https://www.cloudflare.com/>.

2019 [draft-2019-09] IETF Trust <https://www.ietf.org/>, Austin Wright
<aaa@bzfx.net>, Henry Andrews <andrews_henry@yahoo.com>, Ben Hutton
<bh7@sanger.ac.uk>, and Greg Dennis <gregsdennis@yahoo.com>.

2020 [draft-2020-12] IETF Trust <https://www.ietf.org/>, Austin Wright
<aaa@bzfx.net>, Henry Andrews <andrews_henry@yahoo.com>, Ben Hutton
<ben@jsonschema.dev>, and Greg Dennis <gregsdennis@yahoo.com>.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
<!-- MTERM-LICENSE sdk-8 END -->

### JSON Schema meta-schemas draft-07/2019-09/2020-12 through Ajv8.18.0

License selection: BSD-3-Clause. Upstream: [repository](https://github.com/json-schema-org/json-schema-spec), commit `51326f80900357fe3069beb4f5f575db24c1b9a7`; [complete source license](https://raw.githubusercontent.com/json-schema-org/json-schema-spec/51326f80900357fe3069beb4f5f575db24c1b9a7/LICENSE).

<!-- MTERM-LICENSE sdk-9 BEGIN -->
```text
Copyright (c) 2022 JSON Schema Specification Authors

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

---

This Academic Free License (the "License") applies to any original work
of authorship (the "Original Work") whose owner (the "Licensor") has
placed the following licensing notice adjacent to the copyright notice
for the Original Work:

Licensed under the Academic Free License version 3.0

1) Grant of Copyright License. Licensor grants You a worldwide,
royalty-free, non-exclusive, sublicensable license, for the duration of
the copyright, to do the following:

a) to reproduce the Original Work in copies, either alone or as part of
a collective work;

b) to translate, adapt, alter, transform, modify, or arrange the
Original Work, thereby creating derivative works ("Derivative Works")
based upon the Original Work;

c) to distribute or communicate copies of the Original Work and
Derivative Works to the public, under any license of your choice that
does not contradict the terms and conditions, including Licensor's
reserved rights and remedies, in this Academic Free License;

d) to perform the Original Work publicly; and

e) to display the Original Work publicly.

2) Grant of Patent License. Licensor grants You a worldwide,
royalty-free, non-exclusive, sublicensable license, under patent claims
owned or controlled by the Licensor that are embodied in the Original
Work as furnished by the Licensor, for the duration of the patents, to
make, use, sell, offer for sale, have made, and import the Original Work
and Derivative Works.

3) Grant of Source Code License. The term "Source Code" means the
preferred form of the Original Work for making modifications to it
and all available documentation describing how to modify the Original
Work. Licensor agrees to provide a machine-readable copy of the Source
Code of the Original Work along with each copy of the Original Work
that Licensor distributes. Licensor reserves the right to satisfy this
obligation by placing a machine-readable copy of the Source Code in an
information repository reasonably calculated to permit inexpensive and
convenient access by You for as long as Licensor continues to distribute
the Original Work.

4) Exclusions From License Grant. Neither the names of Licensor, nor
the names of any contributors to the Original Work, nor any of their
trademarks or service marks, may be used to endorse or promote products
derived from this Original Work without express prior permission of the
Licensor. Except as expressly stated herein, nothing in this License
grants any license to Licensor's trademarks, copyrights, patents, trade
secrets or any other intellectual property. No patent license is granted
to make, use, sell, offer for sale, have made, or import embodiments
of any patent claims other than the licensed claims defined in Section
2. No license is granted to the trademarks of Licensor even if such
marks are included in the Original Work. Nothing in this License shall
be interpreted to prohibit Licensor from licensing under terms different
from this License any Original Work that Licensor otherwise would have a
right to license.

5) External Deployment. The term "External Deployment" means the use,
distribution, or communication of the Original Work or Derivative
Works in any way such that the Original Work or Derivative Works may
be used by anyone other than You, whether those works are distributed
or communicated to those persons or made available as an application
intended for use over a network. As an express condition for the grants
of license hereunder, You must treat any External Deployment by You of
the Original Work or a Derivative Work as a distribution under section
1(c).

6) Attribution Rights. You must retain, in the Source Code of any
Derivative Works that You create, all copyright, patent, or trademark
notices from the Source Code of the Original Work, as well as any
notices of licensing and any descriptive text identified therein as an
"Attribution Notice." You must cause the Source Code for any Derivative
Works that You create to carry a prominent Attribution Notice reasonably
calculated to inform recipients that You have modified the Original
Work.

7) Warranty of Provenance and Disclaimer of Warranty. Licensor warrants
that the copyright in and to the Original Work and the patent rights
granted herein by Licensor are owned by the Licensor or are sublicensed
to You under the terms of this License with the permission of the
contributor(s) of those copyrights and patent rights. Except as
expressly stated in the immediately preceding sentence, the Original
Work is provided under this License on an "AS IS" BASIS and WITHOUT
WARRANTY, either express or implied, including, without limitation,
the warranties of non-infringement, merchantability or fitness for a
particular purpose. THE ENTIRE RISK AS TO THE QUALITY OF THE ORIGINAL
WORK IS WITH YOU. This DISCLAIMER OF WARRANTY constitutes an essential
part of this License. No license to the Original Work is granted by this
License except under this disclaimer.

8) Limitation of Liability. Under no circumstances and under no legal
theory, whether in tort (including negligence), contract, or otherwise,
shall the Licensor be liable to anyone for any indirect, special,
incidental, or consequential damages of any character arising as a
result of this License or the use of the Original Work including,
without limitation, damages for loss of goodwill, work stoppage,
computer failure or malfunction, or any and all other commercial damages
or losses. This limitation of liability shall not apply to the extent
applicable law prohibits such limitation.

9) Acceptance and Termination. If, at any time, You expressly
assented to this License, that assent indicates your clear and
irrevocable acceptance of this License and all of its terms and
conditions. If You distribute or communicate copies of the Original
Work or a Derivative Work, You must make a reasonable effort under the
circumstances to obtain the express assent of recipients to the terms
of this License. This License conditions your rights to undertake
the activities listed in Section 1, including your right to create
Derivative Works based upon the Original Work, and doing so without
honoring these terms and conditions is prohibited by copyright law and
international treaty. Nothing in this License is intended to affect
copyright exceptions and limitations (including "fair use" or "fair
dealing"). This License shall terminate immediately and You may no
longer exercise any of the rights granted to You by this License upon
your failure to honor the conditions in Section 1(c).

10) Termination for Patent Action. This License shall terminate
automatically and You may no longer exercise any of the rights granted
to You by this License as of the date You commence an action, including
a cross-claim or counterclaim, against Licensor or any licensee
alleging that the Original Work infringes a patent. This termination
provision shall not apply for an action alleging patent infringement by
combinations of the Original Work with other software or hardware.

11) Jurisdiction, Venue and Governing Law. Any action or suit relating
to this License may be brought only in the courts of a jurisdiction
wherein the Licensor resides or in which Licensor conducts its primary
business, and under the laws of that jurisdiction excluding its
conflict-of-law provisions. The application of the United Nations
Convention on Contracts for the International Sale of Goods is
expressly excluded. Any use of the Original Work outside the scope
of this License or after its termination shall be subject to the
requirements and penalties of copyright or patent law in the appropriate
jurisdiction. This section shall survive the termination of this
License.

12) Attorneys' Fees. In any action to enforce the terms of this License
or seeking damages relating thereto, the prevailing party shall
be entitled to recover its costs and expenses, including, without
limitation, reasonable attorneys' fees and costs incurred in connection
with such action, including any appeal of such action. This section
shall survive the termination of this License.

13) Miscellaneous. If any provision of this License is held to be
unenforceable, such provision shall be reformed only to the extent
necessary to make it enforceable.

14) Definition of "You" in This License. "You" throughout this License,
whether in upper or lower case, means an individual or a legal entity
exercising rights under, and complying with all of the terms of, this
License. For legal entities, "You" includes any entity that controls,
is controlled by, or is under common control with you. For purposes of
this definition, "control" means (i) the power, direct or indirect, to
cause the direction or management of such entity, whether by contract
or otherwise, or (ii) ownership of fifty percent (50%) or more of the
outstanding shares, or (iii) beneficial ownership of such entity.

15) Right to Use. You may use the Original Work in all ways not
otherwise restricted or conditioned by this License or by law, and
Licensor promises not to interfere with or be responsible for such uses
by You.

16) Modification of This License. This License is Copyright ©
2005 Lawrence Rosen. Permission is granted to copy, distribute, or
communicate this License without modification. Nothing in this License
permits You to modify this License as applied to the Original Work or
to Derivative Works. However, You may modify the text of this License
and copy, distribute or communicate your modified version (the "Modified
License") and apply it to other original works of authorship subject
to the following conditions: (i) You may not indicate in any way that
your Modified License is the "Academic Free License" or "AFL" and you
may not use those names in the name of your Modified License; (ii) You
must replace the notice specified in the first paragraph above with
the notice "Licensed under <insert your license name here>" or with a
notice of your own that is not confusingly similar to the notice in
this License; and (iii) You may not claim that your original works are
open source software unless your Modified License has been approved by
Open Source Initiative (OSI) and You comply with its license review and
certification process.
```
<!-- MTERM-LICENSE sdk-9 END -->
