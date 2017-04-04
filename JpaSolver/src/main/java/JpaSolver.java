import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.NodeList;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.VariableDeclarator;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.expr.MemberValuePair;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;
import com.github.javaparser.symbolsolver.javaparsermodel.JavaParserFacade;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.JavaParserTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;
import com.google.gson.Gson;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.*;

public class JpaSolver
{
    static CombinedTypeSolver typeSolver;

    public static String getRelationJson(File dir)
    {
        if (!dir.isDirectory()) {
            return null;
        }

        typeSolver = new CombinedTypeSolver();
        typeSolver.add(new ReflectionTypeSolver());
        typeSolver.add(new JavaParserTypeSolver(dir));

        Iterator<File> fileIterator = FileUtils.iterateFiles(dir, new String[]{"java"}, true);

        HashMap<String, EntityVisitor> entities = new HashMap<>();

        while (fileIterator.hasNext()) {
            File f = fileIterator.next();
            EntityVisitor ev = new EntityVisitor();

            try {
                ev.visit(JavaParser.parse(f), null);
            } catch (Exception e) {
                return null;
            }

            if (ev.isEntity) {
                entities.put(ev.className, ev);
            }
        }

        List<HashMap<String, String>> relations = new ArrayList<>();

        for (Map.Entry<String, EntityVisitor> entityItem : entities.entrySet()) {
            EntityVisitor entity = entityItem.getValue();
            for (EntityVisitor.Relation relation : entity.relations) {
                EntityVisitor referencedEntity = entities.get(relation.referencedEntityClass);
                if (referencedEntity != null) {
                    HashMap<String, String> relationMap = new HashMap<>();
                    relationMap.put("from", entity.tableName);
                    relationMap.put("to", referencedEntity.tableName);
                    relationMap.put("fkColumn", relation.columnName);
                    switch (relation.type) {
                        case ManyToOne:
                            relationMap.put("text", "0..N");
                            relationMap.put("toText", "1");
                            break;
                        case ManyToMany:
                            relationMap.put("text", "0..N");
                            relationMap.put("toText", "0..N");
                            break;
                        case OneToMany:
                            relationMap.put("text", "1");
                            relationMap.put("toText", "0..N");
                            break;
                        case OneToOne:
                            relationMap.put("text", "1");
                            relationMap.put("toText", "1");
                            break;
                    }

                    relations.add(relationMap);
                }
            }
        }

        Gson gson = new Gson();
        return gson.toJson(relations);
    }

    public static void main(String[] args) throws FileNotFoundException
    {
        if (args.length < 1) {
            System.out.print("error: not enough args");
            System.exit(1);
        }

        File dir = new File(args[0]);
        if (!dir.isDirectory()) {
            System.out.print("error: input is not a directory");
            System.exit(1);
        }

        String json = getRelationJson(dir);

        if (json == null) {
            System.out.print("error: unknown error occurred");
            System.exit(1);
        }

        System.out.println(json);
    }

    private static class EntityVisitor extends VoidVisitorAdapter<Void>
    {
        boolean isEntity = false;

        String tableName;
        String className;
        List<Relation> relations = new ArrayList<>();

        static class Relation
        {
            enum Type
            {
                NoRelation,
                ManyToOne,
                OneToMany,
                OneToOne,
                ManyToMany
            }

            Type type;
            String columnName;
            String referencedEntityClass;

            Relation(Type type, String columnName)
            {
                this.type = type;
                this.columnName = columnName;
            }
        }

        @Override
        public void visit(ClassOrInterfaceDeclaration c, Void arg)
        {
            // Ignore any non-entity files
            if (!c.isAnnotationPresent("Entity"))
                return;

            tableName = c.getAnnotationByName("Table").map(a -> a.getChildNodes().stream()
                .filter(n -> n instanceof MemberValuePair).map(n -> (MemberValuePair) n)
                .filter(mvp -> mvp.getNameAsString().equals("name")).map(mvp -> mvp.getValue().toString().replace("\"", ""))
                .findAny().orElse(null)).orElse(c.getNameAsString());

            className = JavaParserFacade.get(typeSolver).getTypeDeclaration(c).getQualifiedName();

            // Continue visiting to get fields and stuff
            isEntity = true;
            super.visit(c, arg);
        }

        @Override
        public void visit(FieldDeclaration f, Void arg)
        {
            if (!isEntity)
                return;

            VariableDeclarator v = f.getVariables().stream().findAny().orElse(null);
            if (v == null) {
                super.visit(f, arg);
                return;
            }

            Relation r = new Relation(Relation.Type.NoRelation, null);
            NodeList<AnnotationExpr> annotations = f.getAnnotations();
            annotations.forEach(a -> {
                switch (a.getNameAsString()) {
                    case "ManyToOne":
                        r.type = Relation.Type.ManyToOne;
                        break;
                    case "OneToMany":
                        r.type = Relation.Type.OneToMany;
                        break;
                    case "OneToOne":
                        r.type = Relation.Type.OneToOne;
                        break;
                    case "ManyToMany":
                        r.type = Relation.Type.ManyToMany;
                        break;
                    case "JoinColumn":
                        r.columnName = a.getChildNodes().stream()
                            .filter(n -> n instanceof MemberValuePair).map(n -> (MemberValuePair) n)
                            .filter(mvp -> mvp.getNameAsString().equals("name")).map(mvp -> mvp.getValue().toString().replace("\"", ""))
                            .findAny().orElse(r.columnName);
                        break;
                }
            });

            // If this is a real relation add it to our list
            if (r.type != Relation.Type.NoRelation) {
                // If we haven't set our reference column name yet, set it to the variable name
                if (r.columnName == null)
                    r.columnName = v.getNameAsString();

                // Also figure out the class of the referenced table
                r.referencedEntityClass = JavaParserFacade.get(typeSolver).getType(v).describe();

                relations.add(r);
            }

            super.visit(f, arg);
        }
    }
}
