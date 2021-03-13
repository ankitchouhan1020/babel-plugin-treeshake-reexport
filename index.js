var types = require('@babel/types');
var pathLib = require('path');

function isImportSpecifier(type) {
  return type === 'ImportSpecifier'
}

function relativeToCwd(filename) {
  if (!pathLib.isAbsolute(filename)) {
    filename = pathLib.resolve(__dirname, filename);
  }
  return pathLib.relative(process.cwd(), filename);
}

const importMoudleTransformVisitor = {
  ImportDeclaration(path) {
    const transforms = [];

    const memberImports = path.node.specifiers.filter(specifier => isImportSpecifier(specifier.type));
    const source = path.node.source.value;

    memberImports.forEach(memberImport => {
      const importName = memberImport.imported.name;
      const replacementSource = this.moduleMap[importName] && this.moduleMap[importName].path;

      if(source === replacementSource){
        return;
      }
      // t.importDeclaration(specifiers, source)
      transforms.push(types.importDeclaration(
        [memberImport],
        types.stringLiteral(replacementSource)
      ));
    });

    if (transforms.length) {
      path.replaceWithMultiple(transforms);
    }
  }
}

const exportModuleMapGeneratorVisitor = {
  ExportNamedDeclaration(path) {
    const source = path.node.source && path.node.source.value;
    const specifiers = path.node.specifiers;

    if (!source) {
      return;
    }

    // TODO: Change filename to state.filename
    const currentFile = relativeToCwd(this.state.opts.filename);
    // const exportedModules = specifiers.map(specifier => ({
    //   local: specifier.local.name,
    //   alias: specifier.exported.name,
    //   source
    // }))

    specifiers.forEach(specifier => {
      const alias = specifier.exported.name;
      const modulePath = pathLib.relative(process.cwd(), pathLib.resolve(currentFile, source));
      this.moduleMap[alias] = {
        path: modulePath
      }
    })

    console.log({ moduleMap: JSON.stringify(this.moduleMap) })

    this.programPath.traverse(importMoudleTransformVisitor, {
      state: this.state,
      moduleMap: this.moduleMap
    });
  }
}


module.exports = function () {
  const moduleMap = {};
  return {
    visitor: {
      Program(programPath, state) {
        programPath.traverse(exportModuleMapGeneratorVisitor, {
          state,
          moduleMap,
          programPath
        });
      },
    },
  }
}